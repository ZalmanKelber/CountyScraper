import json
import sqlite3
import csv
import ssl
from urllib.request import urlopen

def get_counties(ctx: dict):
    topojson_url = "https://cdn.jsdelivr.net/npm/us-atlas@3/counties-10m.json"
    with urlopen(topojson_url, context=ctx) as response:
      return json.loads(response.read().decode("utf8"))["objects"]["counties"]["geometries"]

def load_census_data(cur: sqlite3.Cursor):
    with open("county_census_data.csv", "r", encoding="ISO-8859-1") as csv_file:
        csv_reader = list(csv.reader(csv_file))
        print("finished loading reader")
        cur.executescript(''' DROP TABLE IF EXISTS Census_data;

                            CREATE TABLE Census_data (
                            state INTEGER,
                            county INTEGER,
                            total INTEGER,
                            indigenous INTEGER
                            );
                            ''')
        for i in range(1, len(csv_reader)):
            if int(csv_reader[i][5]) == 12 and int(csv_reader[i][6]) == 0:
                state = int(csv_reader[i][1])
                county = int(csv_reader[i][2])
                total = int(csv_reader[i][7])
                indigenous = int(csv_reader[i][18]) + int(csv_reader[i][19])
                name = csv_reader[i][4]
                cur.execute('''INSERT INTO Census_data (state, county, total, indigenous)
                            VALUES (?, ?, ?, ?)''', (state, county, total, indigenous))
    print("finished adding data to sqlite file")

def get_county_info(cur: sqlite3.Cursor, counties: list):
    county_info = dict()
    for county in counties:
        id = county["id"]
        name = county["properties"]["name"]
        if in_50(id):
            [total, indigenous] = get_county_data(cur, id)
            county_info[id] = {"totalIndigenousPopulation": indigenous,
                                "totalPopulation": total,
                                "name": name,
                                "foundEtymology": False}
            cur.execute('''SELECT Languages.language, Languages.is_lang,
                        Families.family, Families.is_indigenous
                        FROM Etymologies JOIN Languages
                        ON Etymologies.lang_ref_id = Languages.id JOIN Families
                        ON Languages.family_ref_id = Families.id
                        WHERE Etymologies.county_id = ?
                        ORDER BY Etymologies.id DESC''', (id,))
            langs = cur.fetchall()
            if len(langs) > 0:
                county_info[id]["foundEtymology"] = True
                found_lang = False
                found_fam = False
                lang, fam = "old world", "old world"
                i = len(langs) - 1
                while not found_lang and i >= 0:
                    if langs[i][3] == 1:
                        if langs[i][1] == 0:
                            found_lang = True
                            lang = langs[i][0]
                            fam = langs[i][2]
                        elif not found_fam:
                            found_fam = True
                            lang = "Unspecified " + langs[i][0]
                            fam = langs[i][2]
                    i -= 1
                if lang == "old world":
                    county_info[id]["nameIsIndigenous"] = False
                else:
                    county_info[id]["nameIsIndigenous"] = True
                    county_info[id]["language"] = lang
                    county_info[id]["family"] = fam
            with open('js/countyInfo.js', 'w') as outfile:
                outfile.write("countyInfo = ")
                json.dump(county_info, outfile)

def in_50(id: int):
    state_id = int(str(id)[:-3])
    if state_id > 56:
        return False
    return True

def get_county_data(cur: sqlite3.Cursor, id: int):
    state_id, county_id = int(str(id)[:-3]), int(str(id)[-3:])
    cur.execute('''SELECT total, indigenous FROM Census_data
                    WHERE state = ? AND county = ?''', (state_id, county_id))
    return cur.fetchall()[0]

def get_language_info(cur: sqlite3.Cursor):
    cur.execute('SELECT family FROM Families WHERE is_indigenous = 1')
    fams = cur.fetchall()
    families = list(map(lambda fam: {"family": fam[0]}, fams))
    for family in families:
        cur.execute('''SELECT language, is_lang FROM Languages JOIN Families
                    ON Languages.family_ref_id = Families.id WHERE family = ?''', (family["family"],))
        langs = cur.fetchall()
        family["languages"] = list(filter(lambda lang: lang, list(map(lambda lang: lang[0] if not lang[1] else None, langs))))
    with open('js/families.js', 'w') as outfile:
        outfile.write("families = ")
        json.dump(families, outfile)

def finalize(cur: sqlite3.Cursor):
    cur.execute('DROP TABLE Census_data')

def main():
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE

    default_dbfile = "countydb.sqlite"
    dbfile = input("Enter name of database file to read from: ") or default_dbfile

    conn = sqlite3.connect(dbfile)
    cur = conn.cursor()
    counties = get_counties(ctx)
    csv_reader = load_census_data(cur)
    get_county_info(cur, counties)
    get_language_info(cur)
    finalize(cur)
    conn.commit()
    conn.close()

if __name__ == "__main__":
    main()

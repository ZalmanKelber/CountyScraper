from urllib.request import urlopen
import urllib.parse
import ssl
import sqlite3
import json
import re

import os,sys,inspect
current_dir = os.path.dirname(os.path.abspath(inspect.getfile(inspect.currentframe())))
parent_dir = os.path.dirname(current_dir)
sys.path.insert(0, parent_dir)
from bs4 import BeautifulSoup

def initialize(cur):
    cur.executescript('''
    DROP TABLE IF EXISTS Links;
    DROP TABLE IF EXISTS Etymologies;
    DROP TABLE IF EXISTS Languages;
    DROP TABLE IF EXISTS Family_links;
    DROP TABLE IF EXISTS Families;

    CREATE TABLE Links (
        id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT UNIQUE,
        link TEXT UNIQUE
    );

    CREATE TABLE Languages (
        id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT UNIQUE,
        language TEXT UNIQUE,
        is_lang BIT,
        family_ref_id INTEGER
    );

    CREATE TABLE Family_links (
        id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT UNIQUE,
        link TEXT UNIQUE
    );

    CREATE TABLE Families (
        id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT UNIQUE,
        family TEXT UNIQUE,
        is_indigenous BIT
    );

    CREATE TABLE Etymologies (
        id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT UNIQUE,
        county_id INTEGER,
        lang_ref_id INTEGER
    );
    ''');

def get_counties(api_info: dict):
    topojson_url = "https://cdn.jsdelivr.net/npm/us-atlas@3/counties-10m.json"
    with urlopen(topojson_url, context=api_info["ctx"]) as response:
      return json.loads(response.read().decode("utf8"))["objects"]["counties"]["geometries"]

def search_counties(cur: sqlite3.Cursor, api_info: dict, counties: list):
    counter = 0;
    for county in counties:
        print(counter, "/", len(counties))
        counter += 1
        id, name = county["id"], county["properties"]["name"]
        try:
            with urlopen("https://en.wiktionary.org/wiki/" + name, context=api_info["ctx"]) as response:
                soup = BeautifulSoup(response.read(), "html.parser")
                langs = soup.find_all("span", {"class" : "etyl"})
                for lang in langs:
                    wiki_link = re.search("/wiki/(.+)",lang.find_all("a")[0]["href"]).group(1)
                    cur.execute('INSERT OR IGNORE INTO Links (link) VALUES (?)', (wiki_link,))
                    cur.execute('SELECT id FROM Links WHERE link = ? ', (wiki_link,))
                    link_id = cur.fetchone()[0]
                    cur.execute('''INSERT OR IGNORE INTO Etymologies
                                (county_id, lang_ref_id) VALUES (?, ?)''', (id, link_id))
        except:
            pass

def search_languages(cur: sqlite3.Cursor, api_info: dict):
    cur.execute('SELECT * FROM Links');
    links = cur.fetchall()
    counter = 0
    for link in links:
        print(counter, "/", len(links))
        counter += 1
        id = link[0]
        language = fixes(link[1])
        try:
            title, family_link, is_lang = get_language_info(language, api_info)
            cur.execute('INSERT OR IGNORE INTO Family_links (link) VALUES (?)', (family_link,))
            cur.execute('SELECT id FROM Family_links WHERE link = ? ', (family_link,))
            link_id = cur.fetchone()[0]
            cur.execute('''INSERT OR IGNORE INTO Languages (language, is_lang, family_ref_id)
                        VALUES (?, ?, ?)''', (title, is_lang, link_id))
            cur.execute('SELECT id FROM Languages WHERE language = ? ', (title,))
            lang_id = cur.fetchone()[0]
            cur.execute('UPDATE Etymologies SET lang_ref_id = ? WHERE lang_ref_id = ?', (lang_id, id))
        except:
            print("problem with", language)

def fixes(language_string: str):
    if language_string == "Proto-Nuclear_Polynesian_language":
        print("found Proto-Nuclear_Polynesian_language")
        return "Proto-Polynesian"
    else:
        return language_string

def get_language_info(language: str, api_info: dict):
    print(language)
    with urlopen("https://en.wikipedia.org/wiki/" + language, context=api_info["ctx"]) as response:
        soup = BeautifulSoup(response.read(), "html.parser")
        title = re.search("(.+) - Wikipedia",soup.find_all("title")[0].text).group(1)
        infobox = soup.find_all("table", {"class" : "infobox"})[0]
        rows = infobox.find_all("tr")
        for row in rows:
            headings = row.find_all("th")
            if len(headings) > 0 :
                heading = headings[0].text.strip()
                if heading == "Linguistic classification":
                    is_lang = True
                    family = re.search("/wiki/(.+)",row.find_all("a")[1]["href"]).group(1)
                    family_link = family if family != "Language_family" else language
                if heading == "Language family":
                    is_lang = False
                    family_link = re.search("/wiki/(.+)",row.find_all("a")[1]["href"]).group(1)
                if "Reconstruction" in heading:
                    print("looking up proto language")
                    is_lang = False
                    ref = re.search("/wiki/(.+)",row.find_all("a")[0]["href"]).group(1)
                    title, family_link, is_lang = get_language_info(ref, api_info)
        if family_link.strip() == "Language_isolate":
            family_link = language
            print("FOUND LANGUAGE ISOLATE:", family_link)
        return (title, family_link, is_lang)

def search_families(cur: sqlite3.Cursor, api_info: dict):
    cur.execute('SELECT * FROM Family_links');
    links = cur.fetchall()
    counter = 0
    for link in links:
        print(counter, "/", len(links))
        counter += 1
        id = link[0]
        family = link[1]
        with urlopen("https://en.wikipedia.org/wiki/" + family, context=api_info["ctx"]) as response:
            soup = BeautifulSoup(response.read(), "html.parser")
            title = re.search("(.+) - Wikipedia",soup.find_all("title")[0].text).group(1)
            print(title)
            infobox = soup.find_all("table", {"class" : "infobox"})[0]
            rows = infobox.find_all("tr")
            for row in rows:
                headings = row.find_all("th")
                if len(headings) > 0 :
                    heading = headings[0].text.strip()
                    if "Geographic" in heading or ("Native" in heading and "to" in heading):
                        ref = re.search("/wiki/(.+)", row.find_all("a")[0]["href"]).group(1)
                        is_indigenous = determine_if_indigenous(api_info, ref)
                        cur.execute('''INSERT OR IGNORE INTO Families (family, is_indigenous)
                                    VALUES (?, ?)''', (title, is_indigenous))
                        cur.execute('SELECT id FROM Families WHERE family = ? ', (title,))
                        fam_id = cur.fetchone()[0]
                        cur.execute('''UPDATE Languages SET family_ref_id = ?
                                        WHERE family_ref_id = ?''', (fam_id, id))

def determine_if_indigenous(api_info: sqlite3.Cursor, ref: str):
    values = dict()
    values["address"] = ref
    values["key"] = api_info["key"]
    data = urllib.parse.urlencode(values)
    url = api_info["service_url"] + data
    response = urlopen(url, context=api_info["ctx"])
    location_data = response.read().decode()
    try:
        js = json.loads(location_data)
        lat = js["results"][0]["geometry"]["location"]["lat"]
        lng = js["results"][0]["geometry"]["location"]["lng"]
        if lng < -20 and lat > 0:
            return True
        else:
            return False
    except:
        print("couldn't load data for", ref)
        return False

def finalize(cur: sqlite3.Cursor):
    cur.executescript('''
    DROP TABLE Links;
    DROP TABLE Family_links;
    ''')

def main():
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE

    api_info = dict()
    api_info["service_url"] = "http://py4e-data.dr-chuck.net/json?"
    api_info["key"] = 42
    api_info["ctx"] = ctx

    default_dbfile = "countydb.sqlite"
    dbfile = input("Enter name of database file to write to: ") or default_dbfile

    conn = sqlite3.connect(dbfile)
    cur = conn.cursor()
    initialize(cur)
    counties = get_counties(api_info)
    search_counties(cur, api_info, counties)
    search_languages(cur, api_info)
    search_families(cur, api_info)
    finalize(cur)
    conn.commit()
    conn.close()

if __name__ == "__main__":
    main()

View live on github pages, [here](https://zalmankelber.github.io/CountyScraper/).

This project scrapes the web for information on the languages and language families that US county names are derived from and visualizes the results.  To run it, download the repository, make sure that bs4 is installed in the parent directory, and that [this file](https://www2.census.gov/programs-surveys/popest/datasets/2010-2019/counties/asrh/cc-est2019-alldata.csv) is saved in the home directory as "county_census_data.csv."  Run county_scraper.py and load_json.py, then simply open up index.html in a browser (no server is required, although your browser will need to recognize ES6).

county_scraper.py uses the Beautiful Soup library to parse through the wiktionary articles for each US county name.  It looks for any links to wikipedia articles on languages that are mentioned in the Etymology sections.  It then parses through those wikipedia articles to determine the root language family of each language.  When these are assembled, it reads the geographical areas spanned by each language family from the wikipedia article and then uses a version of the Google Maps API (made available through Charles Severance's introductory Python course) to determine if those locations are in North America, and consequently whether the language the US county name is derived from is Indigenous or Old World.

load_json.py loads this information, now stored in a sqlite3 database, into a useful JSON format that the ensuing JavaScript files can read and also adds census data about population.  renderCounties.js and renderChart.js use the d3 library to visualize the data.
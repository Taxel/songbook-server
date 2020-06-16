# Aalex' Songbook Server

This is my personal project which is meant as a complete web application that can download Ultimate-Guitar.com tabs, convert them to the chopro format, convert chopro files to .tex files which can then be compiled to a PDF that, at least in my opinion, looks better than a normal chopro file and is optimized for readability on my 10" tablet.
It will also be able to connect to a MobileSheetsPro backup stored in Google Drive and upload new files there directly, as well as provide a nice frontend where a user can edit chopro files and library information.

You can take a look at a pdf that was generated from a chopro file under [`server/public/files/pdf/Rise_Against-Swing_Life_Away.pdf`](https://github.com/Taxel/songbook-server/blob/master/server/public/files/pdf/Rise_Against-Swing_Life_Away.pdf) and one that was written in .tex manually under [`server/public/files/pdf/system_of_a_down-lonely_day.pdf`](https://github.com/Taxel/songbook-server/blob/master/server/public/files/pdf/system_of_a_down-lonely_day.pdf)

## Features

### Backend

- [x] download files as .chopro from ultimate-guitar.com (can't handle tabs yet)
- [x] convert .chopro files to .tex files (not all chopro features supported)
- [x] convert some ascii tablatures to png (breaks sometimes)
- [x] compile .tex files to .pdf optimized for tablet
- [x] watch the directories to do all the conversions listed above automatically
- [x] download MobileSheetsPro database from Google Drive
- [x] edit database in Drive (partial)
- [ ] edit files in Drive
- [ ] add new songs to MobileSheetsPro database
- [ ] propagate changes in chopro or tex files to MSP database automatically
- [ ] ...

### Frontend

- [x] edit chopro files with custom-built syntax highlighting for chopro and tex!
- [x] view all the songs
- [x] edit song title
- [x] delete songs (partial, songs are only deleted from database)
- [ ] edit more song metadata
- [ ] edit artists
- [x] add new song from ultimate-guitar
- [ ] authentication?
- [ ] song wish list, even for unauthenticated users?
- [ ] ...

## Installation

This is probably not complete.
You need to have the following command line tools installed and added to path so they can be run by typing the commands highlighted below. In brackets you can see which versions I am using.

- `npm` (6.13.7)
- `node.js` (v13.9.0)
- Python 3 runnable via `python3` (3.7.2)
- `lilypond` (2.18.2)
- `lualatex` (1.0.4)

### Basics

1. To install the npm packages necessary, first clone this repo with `git clone`

2. Enter the client folder with `cd songbook/client/`

3. Install the client npm packages via `npm install`

4. Change directory to the server `cd ../server/`

5. Install server npm packages `npm install`

6. You should now be able to start the server and client simultaneously from the root directory by typing `npm start`. The server automatically watches for file changes and compiles chopro > tex > pdf when something changes

### Google Drive Setup

1. Generate a JSON service account file and save it as `/server/service-key.json` [this tutorial seems to cover this well, follow it until step 5](https://help.talend.com/reader/E3i03eb7IpvsigwC58fxQg/ol2OwTHmFbDiMjQl3ES5QA)

2. Share the Google Drive folder where your MobileSheetsPro backup is stored with the email address of the service account you just created

3. Copy the Google Drive folder id from its URL (mine looks like this: 1y_cWY52xW...yBmB6ub829qz) to the first line in `/server/example.env`

4. Rename `/server/example.env` to `/server/.env`

5. The server should now be able to connect to Google Drive and download the _mobilesheets.db_ and _mobilesheets_hashcodes.txt_ into `server/public/files/`

const STATUS = {
    LOADING: "loading",
    READY: "ready",
    ERROR: "error"
};

let status = STATUS.LOADING;

const fs = require("fs");
const { Database, OPEN_READWRITE, verbose } = require("sqlite3");
verbose();
const readline = require("readline");
const { google } = require("googleapis");
const path = require("path");
const hashcodes = require("./hashcodes");
const mongo = require("../db/init");

let drive = null;
let database = null;
let db_next_id = -1;
let error = null;
const pdfjsLib = require("pdfjs-dist");

async function init() {
    status = STATUS.LOADING;
    const service_key = require(path.resolve(`${__dirname}/../${process.env.SERVICE_KEY}`));

    let jwtClient = new google.auth.JWT(service_key.client_email, null, service_key.private_key, [
        "https://www.googleapis.com/auth/drive"
    ]);
    try {
        await jwtClient.authorizeAsync();
        drive = google.drive({ version: "v3", auth: jwtClient });
        await downloadDB();
        hashcodes.parseHashcodesFile();
        db_next_id = await getNextId();
        console.log("ready");
        //await cleanUploadFolder();
        //await uploadNewFile("3_doors_down-here_without_you.pdf", "/pdf/");
        const songs = await mongo.getSongs();
        for (let s of songs) {
            const { _id } = s;
            await uploadSong(_id);
        }
        await hashcodes.save();
        await uploadDB();
    } catch (e) {
        console.error("Error:");
        console.error(e);
        error = e;
        status = STATUS.ERROR;
    }
}

/**
 * Executes listFiles and listSubfolders in parallel
 * @param {string} folder_id
 * @returns {Promise<array>} an array with [files, folders]
 */
function listDir(folder_id) {
    return Promise.all([listFiles(folder_id), listSubfolders(folder_id)]);
}

/**
 * Returns a promise that resolves to an array of files directly in the passed directory
 * @param {string} root_folder_id
 */
function listFiles(folder_id) {
    return new Promise((resolve, reject) => {
        drive.files.list(
            {
                fields: `files(id,name,mimeType,modifiedTime,createdTime,originalFilename,fullFileExtension,md5Checksum,size)`,
                q: `'${folder_id}' in parents and mimeType != 'application/vnd.google-apps.folder'`
            },
            (err, res) => {
                if (err) reject("The API returned an error: " + err);
                resolve(res.data.files);
            }
        );
    });
}

/**
 * Returns a promise that resolves to an array of folders directly in the passed directory
 * @param {string} root_folder_id
 */
function listSubfolders(folder_id) {
    return new Promise((resolve, reject) => {
        drive.files.list(
            {
                fields: `files(id, name, modifiedTime)`,
                q: `'${folder_id}' in parents and mimeType = 'application/vnd.google-apps.folder'`
            },
            (err, res) => {
                if (err) reject("The API returned an error: " + err);
                resolve(res.data.files);
            }
        );
    });
}

function downloadFile(file, destinationFolder = "/") {
    const { id, originalFilename } = file;
    const dest = fs.createWriteStream(
        path.resolve(`${__dirname}/../public/files${destinationFolder}${originalFilename}`)
    );
    console.log("downloading file", originalFilename);
    return new Promise((resolve, reject) => {
        drive.files.get({ fileId: id, alt: "media" }, { responseType: "stream" }, (err, res) => {
            res.data
                .on("end", resolve)
                .on("error", reject)
                .pipe(dest);
        });
    });
}

function uploadFile(file, localFolder = "/") {
    return new Promise((resolve, reject) => {
        const { id, originalFilename, mimeType } = file;
        const src = fs.createReadStream(path.resolve(`${__dirname}/../public/files${localFolder}${originalFilename}`));

        drive.files.update(
            {
                fileId: id,
                media: {
                    mimeType,
                    body: src
                },
                uploadType: "multipart"
            },
            (err, res) => {
                if (err) {
                    reject(err);
                    return;
                }
                console.log("uploading file", originalFilename);
                resolve(res);
            }
        );
    });
}

function uploadNewFile(filename, filepath) {
    return new Promise((resolve, reject) => {
        const p = path.resolve(`${__dirname}/../public/files${filepath}${filename}`);
        const src = fs.createReadStream(p);
        const stats = fs.statSync(p);
        drive.files.create(
            {
                uploadType: "multipart",
                resource: {
                    name: filename,
                    parents: [process.env.GDRIVE_UPLOAD_DIR],
                    modifiedTime: stats.mtime
                },
                media: {
                    body: src
                }
            },
            async (err, res) => {
                if (err) {
                    console.error(err);
                    reject(err);
                    return;
                }
                console.log("uploaded file", filename);
                await hashcodes.addToHashfile(filename, filepath);
                await hashcodes.save();
                resolve(res);
            }
        );
    });
}

async function cleanUploadFolder() {
    const files = await listFiles(process.env.GDRIVE_UPLOAD_DIR);
    let proms = [];
    for (let f of files) {
        proms.push(deleteFile(f.id));
    }
    await Promise.all(proms);
    console.log("cleared upload folder");
}

function deleteFile(fileId) {
    return new Promise((resolve, reject) => {
        drive.files.delete(
            {
                fileId
            },
            (err, res) => {
                console.log("deleted file", fileId);
                if (err) {
                    reject(err);
                } else {
                    resolve(res);
                }
            }
        );
    });
}

async function uploadSong(_id) {
    const { uploadDate, songId, pdfPath, artistName, songName } = await mongo.getSongInfo(_id);
    if (!uploadDate) {
        console.log("uploading song", songName);
        // upload file to Drive
        await uploadNewFile(pdfPath, "/pdf/");
        // add file to hash file
        const { lastModified, murmurHash, fileSize } = hashcodes.addToHashfile(pdfPath, "/pdf/");
        // add new song to db
        const newSongID = await getNextId();
        const pages = await pdfPageNumber(path.resolve(`${__dirname}/../public/files/pdf/${pdfPath}`));
        const now = new Date();
        await dbRunQuery(
            `INSERT INTO Songs
         ("Id",
         "Title",
         "Difficulty",
         "LastPage",
         "OrientationLock",
         "Duration",
         "AutoStartAudio",
         "CreationDate",
         "LastModified",
         "SongId") VALUES (NULL,?,0,0,0,0,0,?,?,?);`,
            [songName, now, now, newSongID]
        );
        // add song to files
        await dbRunQuery(
            `INSERT INTO Files
        ("SongId", "Path", "PageOrder", "FileSize", "LastModified", "Source", "Type") 
        VALUES (?,?,?,?,?,1,1)`,
            [newSongID, process.env.GDRIVE_UPLOAD_DIR + "/" + pdfPath, "1-" + pages, fileSize, lastModified]
        );
        console.log("added to files");
        // add song to AutoScroll
        await dbRunQuery(
            `INSERT INTO AutoScroll ("SongId", "Behavior", "PauseDuration", "Speed", "FixedDuration", "ScrollPercent", "ScrollOnLoad") VALUES
        (?, 0, 8000, 3, 1000, 20, 0)`,
            [newSongID]
        );
        // add song to Crop
        await dbRunQuery(
            `INSERT INTO Crop ("SongId", "Page", "Left", "Top", "Right", "Bottom", "Rotation") VALUES
        (?, 0, 0, 0, 0, 0, 0)`,
            [newSongID]
        );
        // add song to MetronomeSettings
        await dbRunQuery(
            `INSERT INTO MetronomeSettings ("SongId", "Sig1", "Sig2", "Subdivision", "SoundFX", "AccentFirst", "AutoStart", "CountIn", "NumberCount", "AutoTurn") VALUES
        (?, 2, 0, 0, 0, 0, 0, 0, 1, 0)`,
            [newSongID]
        );
        // add to MetronomeBeatsPerPage
        await dbRunQuery(
            `INSERT INTO MetronomeBeatsPerPage ("SongId", "Page", "BeatsPerPage") VALUES
        (?, 0, 0)`,
            [newSongID]
        );
        // add to ZoomPerPage
        await dbRunQuery(
            `INSERT INTO ZoomPerPage ("SongId", "Page", "Zoom", "PortPanX", "PortPanY", "LandZoom", "LandPanX", "LandPanY", "FirstHalfY", "SecondHalfY") VALUES
        (?, 0, 100.0, 0.0, 0.0, 100.0, 0.0, 0.0, 0, 0)`,
            [newSongID]
        );
        // Create artist if does not exist
        let artistId = await dbQuery("SELECT Id FROM Artists WHERE Name LIKE ?", [artistName]);
        if (artistId.length === 0) {
            // create artist
            await dbRunQuery(
                `INSERT INTO Artists ("Name", "SortBy", "Ascending", "DateCreated", "LastModified") VALUES (?, 1, 1, ?, ?)`,
                [artistName, now, now]
            );
            artistId = await dbQuery("SELECT Id FROM Artists WHERE Name LIKE ?", [artistName]);
            console.log("created new artist", artistName);
        }
        // add to artist
        if (artistId.length > 0) {
            const { Id } = artistId[0];
            //add song to ArtistsSongs
            await dbRunQuery(`INSERT INTO ArtistsSongs ("ArtistId", "SongId") VALUES (?, ?)`, [Id, newSongID]);
            // update modified date for artist
            await dbRunQuery(
                `UPDATE Artists
                    SET LastModified = ?
                    WHERE Id = ?`,
                [now, Id]
            );
        }

        // Create build server collection if does not exist
        let collId = await dbQuery("SELECT Id FROM Collections WHERE Name LIKE 'build-server'", []);
        if (collId.length === 0) {
            // create artist
            await dbRunQuery(
                `INSERT INTO Collections ("Name", "SortBy", "Ascending", "DateCreated", "LastModified") VALUES ("build-server", 1, 1, ?, ?)`,
                [now, now]
            );
            collId = await dbQuery("SELECT Id FROM Artists WHERE Name LIKE ?", [artistName]);
            console.log("created new artist", artistName);
        }
        // add to collection
        if (collId.length > 0) {
            const { Id } = collId[0];
            //add song to ArtistsSongs
            await dbRunQuery(`INSERT INTO CollectionSong ("CollectionId", "SongId") VALUES (?, ?)`, [Id, newSongID]);
            // update modified date for collection
            await dbRunQuery(
                `UPDATE Collections
                    SET LastModified = ?
                    WHERE Id = ?`,
                [now, Id]
            );
        }
        //in theory this should be everything
        //hashcodes.save();
        mongo.setDataForSong(_id, now, newSongID);
        console.log("added song ", songName);
    } else {
        const didChange = hashcodes.didFileChangeOnDisk(pdfPath, "/pdf/");
        if (didChange) {
            // the file changed so we need to reupload it
            const gdriveFile = await gdriveFileFromName(pdfPath, process.env.GDRIVE_UPLOAD_DIR);
            const fullPdfPath = path.resolve(`${__dirname}/../public/files/pdf/${pdfPath}`);
            const pages = await pdfPageNumber(fullPdfPath);
            const pageOrder = "1-" + pages;
            console.log("uploading changed song", songName);
            // upload file to Drive
            await uploadFile(gdriveFile, "/pdf/");
            // add file to hash file
            const { lastModified, murmurHash, fileSize } = hashcodes.addToHashfile(pdfPath, "/pdf/");
            // add new song to db
            const now = new Date();
            // update song -> last updated
            await dbRunQuery(`UPDATE Songs SET LastModified=? WHERE Id=?`, [lastModified, songId]);
            // update all dbs with this new id
            //changeSongID(songId, newSongID);
            // update files, especially pageOrder
            const file = await dbQuery(
                `SELECT Id
            FROM Files
            ORDER BY Id DESC
            LIMIT 1`,
                []
            );
            const newFileId = file[0].Id + 1;
            await dbRunQuery(`UPDATE Files SET Id=?, LastModified=?, PageOrder=? WHERE SongId=?`, [
                newFileId,
                lastModified,
                pageOrder,
                songId
            ]);

            mongo.setDataForSong(_id, lastModified, songId);
            console.log("updated song ", songName);
        }
        //check if file has changed on disk
    }
}

async function pdfPageNumber(fullFilePath) {
    const doc = await pdfjsLib.getDocument(fullFilePath).promise;
    return doc.numPages;
}

function openDatabase() {
    return new Promise((resolve, reject) => {
        const db = new Database(path.resolve(`${__dirname}/../public/files/mobilesheets.db`), OPEN_READWRITE)
            .on("error", reject)
            .on("open", () => resolve(db));
    });
}

function gdriveFileFromName(filename, folder) {
    return new Promise((resolve, reject) => {
        drive.files.list(
            {
                fields: `files(id,name,mimeType,modifiedTime,createdTime,originalFilename,fullFileExtension,md5Checksum,size)`,
                q: `'${folder}' in parents and mimeType != 'application/vnd.google-apps.folder' and name = '${filename}'`
            },
            (err, res) => {
                if (err) reject("The API returned an error: " + err);
                resolve(res.data.files[0]);
            }
        );
    });
}

/**
 * Executes database.all and resolves with the selected rows
 * @param {string} query
 * @param {array} params
 * @returns {array} selected rows
 */
function dbQuery(query, params = []) {
    return new Promise((resolve, reject) => {
        if (!database) {
            reject("Database is not opened");
        }
        database.all(query, params, (error, rows) => {
            if (error) {
                console.error("Error in dbQuery:");
                console.error(error);
                reject(error);
            }
            resolve(rows);
        });
    });
}

/**
 * Executes database.run without returning data
 * @param {string} query
 * @param {array} params
 * @returns {array} selected rows
 */
function dbRunQuery(query, params = []) {
    //console.log(query);
    return new Promise((resolve, reject) => {
        if (!database) {
            reject("Database is not opened");
        }
        database.run(query, params, error => {
            if (error) {
                console.error("Error in dbQuery:");
                console.error(error);
                reject(error);
            }
            resolve();
        });
    });
}

async function getNextId() {
    const idRows = await dbQuery(`SELECT Id
    FROM Songs
    ORDER BY Id DESC
    LIMIT 1`);
    return idRows[0].Id + 1;
}

async function deleteSongID(oldID) {
    console.log("Deleting song with id", oldID);
    await dbRunQuery(`DELETE FROM Songs WHERE Id=?`, [oldID]);

    // update modified date in indirectly connected songs
    const tablesToModifyDate = [{ table: "Artists", lookupDB: "ArtistsSongs", idField: "ArtistId" }];
    let promises = tablesToModifyDate.map(
        async ({ table, lookupDB, idField }) =>
            await dbRunQuery(
                `UPDATE ${table}
    SET LastModified = ?
    WHERE Id = (SELECT ${idField}
    FROM ${lookupDB}
    WHERE SongId = ?)`,
                [new Date(), oldID]
            )
    );
    await Promise.all(promises);

    const tables = [
        "AutoScroll",
        "Crop",
        "Files",
        "ArtistsSongs",
        "MetronomeSettings",
        "MetronomeBeatsPerPage",
        "ZoomPerPage"
    ];

    promises = tables.map(
        async table =>
            await dbQuery(
                `DELETE FROM ${table}
                WHERE SongId=?`,
                [oldID]
            )
    );
    await Promise.all(promises);
    console.log("deleted song id", oldID);
}

async function createSong(gdrive_path) {}

async function changeSongID(oldID, newID) {
    const tables = [
        "AutoScroll",
        "Crop",
        "Files",
        "ArtistsSongs",
        "MetronomeSettings",
        "MetronomeBeatsPerPage",
        "ZoomPerPage"
    ];

    let promises = tables.map(
        async table =>
            await dbRunQuery(
                `UPDATE ${table}
    SET
        SongId=?,
        Id=(SELECT Id
            FROM ${table}
            ORDER BY Id DESC
            LIMIT 1) + 1
    WHERE
        SongId=?`,
                [newID, oldID]
            )
    );
    await Promise.all(promises);
    // update modified date in indirectly connected songs
    const tablesToModifyDate = [{ table: "Artists", lookupDB: "ArtistsSongs", idField: "ArtistId" }];
    promises = tablesToModifyDate.map(
        async ({ table, lookupDB, idField }) =>
            await dbRunQuery(
                `UPDATE ${table}
    SET LastModified = ?
    WHERE Id = (SELECT ${idField}
    FROM ${lookupDB}
    WHERE SongId = ?)`,
                [new Date(), newID]
            )
    );
    await Promise.all(promises);
    console.log("changed song id", oldID, "to", newID);
}

async function uploadDB() {
    let [files, folders] = await listDir(process.env.GDRIVE_ROOT);
    for (const f of files) {
        await uploadFile(f);
    }
    console.log("uploaded db and hashes");
}

/**
 * Downloads mobilesheets.db, hashcodes and opens the database
 */
async function downloadDB() {
    if (database) {
        console.log("closing db before updating it");
        database.close();
    }
    let [files, folders] = await listDir(process.env.GDRIVE_ROOT);
    console.log("updating hashcodes and database...");
    for (const f of files) {
        await downloadFile(f);
    }
    try {
        database = await openDatabase();

        console.log("Database updated from GDrive");
        status = STATUS.READY;
    } catch (err) {
        console.error("Could not open DB:");
        console.error(err);
        status = STATUS.ERROR;
    }
}

init();

// const googleDriveInstance = new NodeGoogleDrive({
//     ROOT_FOLDER: process.env.GDRIVE_ROOT
// });

module.exports.getStatus = () => status;
module.exports.getNextSongID = getNextId;
module.exports.changeSongID = changeSongID;
module.exports.deleteSongID = deleteSongID;
module.exports.dbQuery = dbQuery;
module.exports.dbRunQuery = dbRunQuery;
module.exports._getDB = () => database;
module.exports.uploadDB = uploadDB;
module.exports.downloadDB = downloadDB;

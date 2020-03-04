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
require("dotenv").config();
const hashcodes = require("./hashcodes");

let drive = null;
let database = null;
let db_next_id = -1;
let error = null;

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

function uploadFile(file, destinationFolder = "/") {
    return new Promise((resolve, reject) => {
        const { id, originalFilename, mimeType } = file;
        const src = fs.createReadStream(
            path.resolve(`${__dirname}/../public/files${destinationFolder}${originalFilename}`)
        );

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

function openDatabase() {
    return new Promise((resolve, reject) => {
        const db = new Database(path.resolve(`${__dirname}/../public/files/mobilesheets.db`), OPEN_READWRITE)
            .on("error", reject)
            .on("open", () => resolve(db));
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

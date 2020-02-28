const STATUS = {
    LOADING: "loading",
    READY: "ready",
    ERROR: "error"
};

let status = STATUS.LOADING;

const fs = require("fs");
const { Database, OPEN_READONLY, verbose } = require("sqlite3");
verbose();
const readline = require("readline");
const { google } = require("googleapis");
const path = require("path");
require("dotenv").config();

let drive = null;
let database = null;
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
        //let [files, folders] = await listDir(process.env.GDRIVE_ROOT);
        // console.log("updating hashcodes and database...");
        // for (const f of files) {
        //     //await downloadFile(f);
        // }
        database = await openDatabase();
        status = STATUS.READY;
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

function openDatabase() {
    return new Promise((resolve, reject) => {
        const db = new Database(path.resolve(`${__dirname}/../public/files/mobilesheets.db`))
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
    console.log("query: " + query);
    return new Promise((resolve, reject) => {
        if (!database) {
            reject("Database is not opened");
        }
        database.all(query, params, (error, rows) => {
            if (error) {
                reject(error);
            }
            resolve(rows);
        });
    });
}

init();

// const googleDriveInstance = new NodeGoogleDrive({
//     ROOT_FOLDER: process.env.GDRIVE_ROOT
// });

module.exports.getStatus = () => status;
module.exports.dbQuery = dbQuery;

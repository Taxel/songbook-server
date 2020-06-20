const fs = require("fs");
const { promisify } = require("util");
const readline = require("readline");
const path = require("path");
const { murmurHash } = require("murmurhash-native");

const hashfilePath = path.resolve(`${__dirname}/../public/files/mobilesheets_hashcodes.txt`);
const testfilePath = path.resolve(`${__dirname}/../public/files/Are You Lonesome Tonight_.jpg`);
const readFileAsync = promisify(fs.readFile);
const statAsync = promisify(fs.stat);
const writeAsync = promisify(fs.writeFile);
let parsed = {};

// this just starts the parsing
// it is non blocking
function parseHashcodesFile() {
    const readInterface = readline.createInterface({
        input: fs.createReadStream(hashfilePath),
        output: process.stdout,
        console: false
    });
    let buffer = [];
    readInterface.on("line", line => {
        buffer.push(line);
        if (buffer.length === 4) {
            parsed[buffer[0]] = {
                murmurHash: Number(buffer[1]),
                lastModified: new Date(Number(buffer[2])),
                fileSize: Number(buffer[3])
            };
            buffer = [];
        }
    });

    readInterface.on("close", () => {
        console.log("Parsed hashcodes file");
        //console.log(parsedToText(parsed));
    });
}
async () => {
    const testFileHashObj = await hashcodeObjFromFilePath(testfilePath);
    console.log(testFileHashObj);
};

function parsedToText(p) {
    let ret = [];
    for (const key of Object.keys(p)) {
        ret.push(key);
        const { murmurHash, lastModified, fileSize } = p[key];
        ret.push(murmurHash);
        ret.push(lastModified.getTime());
        ret.push(fileSize);
    }

    return ret.join("\n");
}

async function hashcodeObjFromFilePath(filepath) {
    const buf = await readFileAsync(filepath);
    const h = murmurHash(buf, "buffer", 0xc58f1a7b);
    hash = h.readInt32BE();
    const stat = await statAsync(filepath);
    return {
        murmurHash: h.readInt32BE(),
        lastModified: stat["mtime"],
        fileSize: stat["size"]
    };
}

async function save() {
    const data = parsedToText(parsed);
    await writeAsync(hashfilePath, data);
    console.log("Wrote new hashfile");
}

async function addToHashfile(filename, filepath) {
    const key = process.env.GDRIVE_UPLOAD_DIR + "/" + filename;
    const p = path.resolve(`${__dirname}/../public/files${filepath}${filename}`);
    const data = await hashcodeObjFromFilePath(p);
    parsed[key] = data;
    return data;
}

async function didFileChangeOnDisk(filename, filepath) {
    const key = process.env.GDRIVE_UPLOAD_DIR + "/" + filename;
    const p = path.resolve(`${__dirname}/../public/files${filepath}${filename}`);
    const data = await hashcodeObjFromFilePath(p);
    return parsed[key].lastModified !== data.lastModified;
}

module.exports.parseHashcodesFile = parseHashcodesFile;
module.exports.save = save;
module.exports.addToHashfile = addToHashfile;
module.exports.didFileChangeOnDisk = didFileChangeOnDisk;

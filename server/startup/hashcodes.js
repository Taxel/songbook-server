const fs = require("fs");
const { promisify } = require("util");
const readline = require("readline");
const path = require("path");
const { murmurHash } = require("murmurhash-native");

const hashfilePath = path.resolve(`${__dirname}/../public/files/mobilesheets_hashcodes.txt`);
const testfilePath = path.resolve(`${__dirname}/../public/files/Are You Lonesome Tonight_.jpg`);
const readFileAsync = promisify(fs.readFile);
let parsed = [];

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
            parsed.push({
                filePath: buffer[0],
                murmurHash: Number(buffer[1]),
                lastModified: new Date(Number(buffer[2])),
                fileSize: Number(buffer[3])
            });
            buffer = [];
        }
    });

    readInterface.on("close", () => {
        console.log("Parsed hashcodes file");
        //console.log(parsed);
    });
}

//hashcodeObjFromFilePath(testfilePath);

async function hashcodeObjFromFilePath(filepath) {
    const buf = await readFileAsync(filepath);
    const maxInt = Number("21474836477");
    //const h =       Number("4275668817")
    const h = murmurHash(buf, 0xc58f1a7b);
    console.log(h.toString(2));
    const fromHashFile = Number("-1274144557");
    //console.log(fromHashFile.toString(2));
    console.log(h);
    console.log("hash from hashcodes file: ");
}

module.exports.parseHashcodesFile = parseHashcodesFile;

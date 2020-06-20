const LocalFiles = require("./LocalFiles");
const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");

async function addPDFs() {
    const pdfs = await fs.promises.readdir(path.resolve(`${__dirname}/../public/files/pdf/`));
    const texs = await fs.promises.readdir(path.resolve(`${__dirname}/../public/files/tex/`));
    const chos = await fs.promises.readdir(path.resolve(`${__dirname}/../public/files/chopro/`));
    for (let f of pdfs) {
        const found = await LocalFiles.findOne({ pdfPath: f }).lean();
        if (!found) {
            const noExt = f.substring(0, f.length - 4).toLowerCase();
            let s = f.replace(/_/g, " ").split("-");
            let songName = s.pop().split(".");
            // remove file extension
            songName.pop();
            songName = songName.join(".");

            const artistName = s.join("-");
            let doc = { pdfPath: f, songName, artistName };
            const sameStart = elem => elem.toLowerCase().startsWith(noExt);
            const t = texs.filter(sameStart);
            if (t.length > 0) {
                doc.texPath = t[0];
            }

            const c = chos.filter(sameStart);
            if (c.length > 0) {
                doc.choPath = c[0];
            }

            const lf = await LocalFiles.create(doc);
            //console.log(lf);
        }
    }
}

async function getSongs() {
    return await LocalFiles.find({}, { pdfPath: 1, texPath: 1, choPath: 1, songName: 1, artistName: 1 });
}

async function getSongInfoFromID(_id) {
    return await LocalFiles.findOne({ _id });
}

async function setData(_id, uploadDate, songId) {
    return await LocalFiles.updateOne({ _id }, { $set: { uploadDate, songId } });
}

(async () => {
    console.log("initializing mongo");
    await mongoose.connect(process.env.MONGO_URL, { useNewUrlParser: true });
    await addPDFs();
    console.log("mongo initialized");
})();

module.exports.getSongs = getSongs;
module.exports.getSongInfo = getSongInfoFromID;
module.exports.setDataForSong = setData;

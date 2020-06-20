const mongoose = require("mongoose");

const LocalFilesSchema = new mongoose.Schema({
    songName: {
        type: String
    },
    artistName: {
        type: String
    },
    pdfPath: {
        type: String,
        unique: true
    },
    texPath: {
        type: String,
        unique: true
    },
    choPath: {
        type: String,
        optional: true
    },
    uploadDate: {
        type: Date,
        default: null
    },
    songId: {
        type: Number,
        default: -1
    }
});

const LocalFiles = mongoose.model("LocalFiles", LocalFilesSchema);

module.exports = LocalFiles;

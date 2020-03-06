var express = require("express");
var router = express.Router();

let localFileWatch = require("../startup/localFileWatch");
let ugConverter = require("../startup/ugConverter");
const fs = require("fs");

/* GET home page. */
router.get("/list", function(req, res, next) {
    let json = {
        cho: localFileWatch.getChoFiles(),
        tex: localFileWatch.getTexFiles(),
        pdf: localFileWatch.getPdfFiles()
    };
    res.send(json);
});

router.get("/status", function(req, res, next) {
    res.send(localFileWatch.getStatus());
});

router.get("/ugchopro", async function(req, res, next) {
    let url = req.query.url;
    if (!url) {
        res.status(400).send("You need to provide a url");
    }
    // split url along - and take last element. This is the id
    const urlParts = url.split("-");
    let id = urlParts[urlParts.length - 1];

    let text, tmp;
    try {
        tmp = await ugConverter.getUGChords(id);
        text = ugConverter.ugChordsToChopro(tmp);
        res.send({ artist: tmp.artist, title: tmp.song, text });
    } catch (err) {
        console.error(err);
        res.status(500).send(JSON.stringify(err));
    }
    res.status(500).send();
});

router.get("/log");

router.post("/edit", function(req, res, next) {
    let { filepath, content } = req.body;
    if (!filepath || !content) {
        console.error("invalid post request - not filepath and content in body");
        res.status(500).send("request has to have both filepath and request");
    }
    // NOTE: this is not sufficiently protected! It just helps me program fewer bugs
    // one can overwrite any file on disk with this at the moment!
    if (!filepath.startsWith("/files/")) {
        console.error("invalid post request: filepath has to be in files");
        res.status(500).send("/files/ needs to be in path");
    }
    try {
        fs.writeFileSync(`${__dirname}/../public${filepath}`, content);
    } catch (err) {
        console.error(err);
        res.status(500).send(err);
    }
    res.send(200);
});
module.exports = router;

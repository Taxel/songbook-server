var express = require("express");
var router = express.Router();
var sync_gdrive = require("../startup/sync_gdrive");

/* GET home page. */
router.get("/status", async (req, res, next) => {
    res.send(sync_gdrive.getStatus());
});

const songs_sql = `SELECT 
Songs.Id as SongID, Songs.Title, Songs.CreationDate, Songs.LastModified, Files.Path, Files.PageOrder, Files.FileSize, Files.Type, Artists.Id as ArtistID, Artists.Name as ArtistName
FROM Songs 
LEFT JOIN Files ON Songs.Id = Files.SongId 
LEFT JOIN ArtistsSongs ON Songs.Id = ArtistsSongs.SongId 
LEFT JOIN Artists ON ArtistsSongs.ArtistId=Artists.Id`;

router.get("/songs", async (req, res, next) => {
    const result = await sync_gdrive.dbQuery(songs_sql);
    res.send(result);
});

/* GET sql query result */
router.post("/editSong", async (req, res, next) => {
    let { id, column, newValue } = req.body;
    console.log(req.body);
    if (!id || !column || !newValue) {
        res.status(500).send("Request must have id, column, newValue");
        return;
    }
    console.log({ id, column, newValue });
    let result;
    if (column === "Title") {
        const newSongID = await sync_gdrive.getNextSongID();
        await sync_gdrive.dbRunQuery(`UPDATE Songs SET Title=?, LastModified=?, Id=? WHERE Id=?`, [
            newValue,
            new Date(),
            newSongID,
            id
        ]);
        console.log("changed song title. Now updating other DBs");
        await sync_gdrive.changeSongID(id, newSongID);
        console.log("updated song title!");
    } else if (column !== "Title") {
        res.status(504).send("Not implemented");
        return;
        result = await sync_gdrive.dbQuery(`UPDATE Songs SET Title=?, LastModified=? WHERE id=?`, [
            newValue,
            Date.now(),
            id
        ]);
    }
    res.status(200).send("OK");
});

router.post("/deleteSong", async (req, res, next) => {
    let { id } = req.body;
    console.log(id);
    if (!id) {
        res.status(500).send("Request must have id in body");
    }
    await sync_gdrive.deleteSongID(id);
    res.status(200).send("Ok");
});

router.get("/pushDB", async (req, res, next) => {
    console.log("pushing DB to GDrive");
    await sync_gdrive.uploadDB();
    res.status(200).send("OK");
});

router.get("/pullDB", async (req, res, next) => {
    await sync_gdrive.downloadDB();
    res.status(200).send("OK");
});

module.exports = router;

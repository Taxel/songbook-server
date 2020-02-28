var express = require("express");
var router = express.Router();
var sync_gdrive = require("../startup/sync_gdrive");

/* GET home page. */
router.get("/status", async (req, res, next) => {
    res.send(sync_gdrive.getStatus());
});

/* GET sql query result */
router.post("/db", async (req, res, next) => {
    let { select, from, where } = req.body;
    console.log(req.body);
    if (!select) {
        res.status(500).send("no select parameter provided");
        return;
    }
    if (!from) {
        res.status(500).send("no from parameter provided");
        return;
    }
    if (!where) {
        where = "true == true";
    }

    // TODO: NEVER let code like this out to production!
    // this makes SQL injection TRIVIAL!
    const result = await sync_gdrive.dbQuery(`SELECT ${select} FROM ${from} WHERE ${where}`);
    console.log(result);
    res.send(result);
});

module.exports = router;

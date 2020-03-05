var createError = require("http-errors");
var express = require("express");
var path = require("path");
var cookieParser = require("cookie-parser");
var logger = require("morgan");
var autobuild = require("./startup/localFileWatch");
require("dotenv").config();

var indexRouter = require("./routes/index");
var gdriveRouter = require("./routes/gdrive");
var localRouter = require("./routes/localfiles");

var app = express();

// view engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

function logIncomingRequest(tokens, req, res) {
    const url = tokens.url(req, res);
    // do not log status
    if (url === "/local/status") {
        return null;
    }
    return [
        tokens.method(req, res),
        url,
        tokens.status(req, res),
        tokens.res(req, res, "content-length"),
        "-",
        tokens["response-time"](req, res),
        "ms"
    ].join(" ");
}
app.use(logger(logIncomingRequest));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

app.use("/", indexRouter);
app.use("/gdrive", gdriveRouter);
app.use("/local", localRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
    next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get("env") === "development" ? err : {};

    // render the error page
    res.status(err.status || 500);
    res.render("error");
});

module.exports = app;

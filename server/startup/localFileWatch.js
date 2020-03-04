const chokidar = require("chokidar");
const { exec } = require("child_process");
const path = require("path");
const fs = require("fs");

const scripts_dir = path.join(__dirname, "../scripts/");
const log_dir = path.join(__dirname, "../logs/");
const cho_dir = path.join(__dirname, "/../public/files/chopro");
const tex_dir = path.join(__dirname, "/../public/files/tex");
const pdf_dir = path.join(__dirname, "/../public/files/pdf");

// file lists. exported from here because they are watched from here
let cho_file_list = [];
let tex_file_list = [];
let pdf_file_list = [];

// update file lists initially
const readChoDir = () => fs.readdir(cho_dir, (err, files) => (cho_file_list = files));
const readTexDir = () => fs.readdir(tex_dir, (err, files) => (tex_file_list = files));
const readPdfDir = () => fs.readdir(pdf_dir, (err, files) => (pdf_file_list = files));

let pdf_status = {
    in_progress: false,
    queued: false,
    last_run: false,
    script: "update-pdfs"
};

let tex_status = {
    in_progress: false,
    queued: false,
    last_run: false,
    script: "update-tex"
};

const getStatusObj = s => {
    if (s === "pdf") {
        return pdf_status;
    } else {
        return tex_status;
    }
};

// update function that is called on the corresponding status object
const update = status_str => {
    const status_obj = getStatusObj(status_str);
    if (status_obj.in_progress) {
        // script is running. queue it to run again
        status_obj.queued = true;
        return;
    }
    console.log(`Updating ${status_str} files...`);
    // run update-pdfs script
    console.log("executing script: ", `py -3 ./${status_obj.script}.py --batch`);
    exec(`py -3 ./${status_obj.script}.py --batch`, { cwd: scripts_dir }, (error, stdout, stderr) => {
        if (error) {
            console.error(error);
        }
        const status_obj = getStatusObj(status_str);
        status_obj.last_run = JSON.parse(stdout);
        if (!status_obj.queued) {
            // nothing queued
            status_obj.in_progress = false;
        } else {
            update(status_str);
            status_obj.queued = false;
        }
    });
    status_obj.in_progress = true;
};

// whenever the tex files change, rerun the update-pdfs script
chokidar.watch(tex_dir, { ignoreInitial: true }).on("all", (event, path) => {
    if (event === "change" || event === "add") {
        update("pdf");
    } else if (event === "remove") {
        console.error("file removed from /tex/ dir");
        console.error("This is not implemented!");
    }
    readTexDir();
});

// whenever the tex files change, rerun the update-tex script
chokidar.watch(cho_dir, { ignoreInitial: true }).on("all", (event, path) => {
    if (event === "change" || event === "add") {
        update("tex");
    } else if (event === "remove") {
        console.error("file removed from /tex/ dir");
        console.error("This is not implemented!");
    }
    readChoDir();
});

chokidar.watch(pdf_dir, { ignoreInitial: true }).on("all", (event, path) => {
    readPdfDir();
});

// init vars
readPdfDir();
readTexDir();
readChoDir();
update("pdf");
update("tex");

console.log("Started directory watcher");

module.exports = {
    getChoFiles: () => cho_file_list,
    getTexFiles: () => tex_file_list,
    getPdfFiles: () => pdf_file_list,
    getStatus: () => ({ pdf: pdf_status, tex: tex_status })
};

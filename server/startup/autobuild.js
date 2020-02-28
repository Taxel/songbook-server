const chokidar = require("chokidar");
const { exec } = require("child_process");
const path = require("path");

const scripts_dir = path.join(__dirname, "../scripts/");
const log_dir = path.join(__dirname, "../logs/");

let update_pdfs_in_progress = false;
// whenever the tex files change, rerun the update-pdfs script
chokidar.watch(`${__dirname}/../public/files/tex/`, { ignoreInitial: true }).on("all", (event, path) => {
    if (event === "change" || event === "add") {
        if (update_pdfs_in_progress) {
            console.warn("file was changed but script is still running. aborting.");
            return;
        }
        console.log("tex file changed. Updating PDFs...");
        // run update-pdfs script
        exec(`py -3 ./update-pdfs.py`, { cwd: scripts_dir }, (error, stdout, stderr) => {
            console.log(stdout);
            update_pdfs_in_progress = false;
        });
    } else if (event === "remove") {
        console.error("file removed from /tex/ dir");
        console.error("This is not implemented!");
    }
    update_pdfs_in_progress = true;
});

let update_tex_in_progress = false;
// whenever the tex files change, rerun the update-pdfs script
chokidar.watch(`${__dirname}/../public/files/chopro/`, { ignoreInitial: true }).on("all", (event, path) => {
    if (event === "change" || event === "add") {
        if (update_tex_in_progress) {
            console.warn("file was changed but script is still running. aborting.");
            return;
        }
        console.log("chopro file changed. Updating tex files...");
        // run update-pdfs script
        exec(`py -3 ./update-tex.py`, { cwd: scripts_dir }, (error, stdout, stderr) => {
            console.log(stdout);
            update_tex_in_progress = false;
        });
    } else if (event === "remove") {
        console.error("file removed from /chopro/ dir");
        console.error("This is not implemented!");
    }
    update_tex_in_progress = true;
});

console.log("Started directory watcher");

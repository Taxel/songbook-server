const siteUrl = "https://ultimate-guitar.com/";

const puppeteer = require("puppeteer");
const { resolve } = require("path");
const user = process.env.UG_NAME;
const pass = process.env.UG_PASSWORD;

let status = "logging_in";

const login = async () => {
    console.log("trying to log into UG");
    const browser = await puppeteer.launch({ userDataDir: resolve("./puppeteer/") });
    const page = await browser.newPage();
    await page.goto("https://ultimate-guitar.com");
    try {
        const acceptCookies = await page.waitForXPath("/html/body/div[3]/div/div/div/div/footer/button[1]", {
            timeout: 2000
        });
        await acceptCookies.click();
    } catch (err) {
        // cookies are accepted alredy. this is fine.
    }
    try {
        const loginButton = await page.waitForXPath(
            "/html/body/div[1]/div[1]/div[2]/main/div[1]/article/header/button[2]",
            { timeout: 2000 }
        );
        await loginButton.click();
    } catch (err) {
        console.log("user is logged in already");
        status = "ready";
        browser.close();
        return;
    }

    const usernameField = await page.waitForXPath(
        "/html/body/div[4]/article/section/div[2]/div/div/form/div/div[1]/input"
    );
    const passwordField = await page.waitForXPath(
        "/html/body/div[4]/article/section/div[2]/div/div/form/div/div[2]/div/input"
    );

    await usernameField.focus();
    await page.keyboard.type(user);
    await passwordField.focus();
    await page.keyboard.type(pass);

    const submitButton = await page.waitForXPath(
        "/html/body/div[4]/article/section/div[2]/div/div/form/div/footer/button"
    );
    await submitButton.click();
    console.log("logged into UG"); // presale@celsius.network
    status = "ready";
    browser.close();
};

const getUGChords = async id => {
    if (status !== "ready") {
        console.error("User is not logged in yet. Could not get UG chords");
        return;
    }
    console.log("downloading id ", id);
    const browser = await puppeteer.launch({ headless: true, userDataDir: resolve("./puppeteer/") });
    const page = await browser.newPage();
    await page.goto(
        `https://www.ultimate-guitar.com/contribution/correct/create?id=${id}&utm_source=ug&utm_medium=internal&utm_campaign=tab&utm_content=cta&utm_term=suggest_correction`
    );
    await page.waitFor(1000);
    try {
        const showChordsButton = await page.waitForSelector(".bootstrap-switch", (timeout = 1000));
        await showChordsButton.click();
    } catch (err) {
        console.error("Show chords button not found. continuing without it.");
    }
    console.log("clicked show chords");
    await page.waitFor(1000);
    const chordData = await page.waitForSelector("[data-contents=true]");
    console.log("found chord data");
    let chords = await page.evaluate(el => el.innerHTML, chordData);
    const header = await page.waitForXPath('//*[@id="page-content"]/h2');
    let headLine = await page.evaluate(el => el.textContent, header);
    //browser.close();
    console.log({ headLine });
    let [_, artist, song] = headLine.match(/Correction: (.+) - (.+) \(.*\)/);
    console.log(`Downloaded all data for ${song} by ${artist}`);
    // remove all <div...> and </div>
    chords = chords.replace(/<\/?div.*?>/gm, "");
    // remove all <span...>
    chords = chords.replace(/<span.*?>/gm, "");
    // add newlines on the rest of html elements
    chords = chords.replace(/<\/span><\/span>|<br data-text="true"><\/span>/gm, "\n");
    return { chords, artist, song };
};

// execAll ES6 magic from Stackoverflow
RegExp.prototype.execAllGen = function*(input) {
    for (let match; (match = this.exec(input)) !== null; ) yield match;
};
RegExp.prototype.execAll = function(input) {
    return [...this.execAllGen(input)];
};

//splice into string
function spliceSlice(str, index, add) {
    // We cannot pass negative indexes directly to the 2nd slicing operation.
    if (index < 0) {
        index = str.length + index;
        if (index < 0) {
            index = 0;
        }
    }

    return str.slice(0, index) + add + (str.slice(index) || " ");
}

const mergeChordsIntoLine = (chordLine, textLine) => {
    const matches = /(\[ch\].*?\[\/ch\])/gm.execAll(chordLine);
    // for some reason we need to add one to the second match index, two to the third...
    let addOffset = 0;
    for (const match of matches) {
        textLine = spliceSlice(textLine, match.index + addOffset++, match[0]);
    }
    //console.log(matches);
    return [textLine];
};

const songPartFromString = (str, isEnding = false) => {
    const lower = str.toLowerCase();
    if (lower.startsWith("chorus") || lower.startsWith("refrain")) {
        return isEnding ? "{eoc}" : "{boc}";
    }
    if (lower.startsWith("verse")) {
        return isEnding ? "{end_of_verse}" : "{begin_of_verse}";
    }
    switch (str.toLowerCase()) {
        case "chorus":

        default:
            return `{c:[${isEnding ? "/" : ""}${lower}]}\n`;
    }
};

const ugChordsToChopro = ({ chords, artist, song, capo = 0, bpm = 0 }) => {
    let lines = chords.split("\n");
    let linesWithInfo = [];
    let final = [];
    for (const line of lines) {
        let isChordLine = /.*[ch].*?\[\/ch\]/.test(line);
        let isTabLine = /[|\-0-9ph]{5,}$/.test(line);

        linesWithInfo.push({
            line,
            isChordLine,
            isTabLine
        });
    }
    let inTabEnv = false;
    // loop over lines again, now with info if it's a chord line and in a window of two.
    for (let i = 0; i < linesWithInfo.length - 1; i++) {
        let { line, isChordLine, isTabLine } = linesWithInfo[i];
        if (isTabLine && !inTabEnv) {
            inTabEnv = true;
            final.push("{bot}");
            final.push(line);
            continue;
        }
        if (inTabEnv && !isTabLine) {
            inTabEnv = false;
            final.push("{eot}");
        }
        if (!isChordLine) {
            final.push(line);
        } else {
            // if chordLine
            let { line: nextLine, isChordLine: isNextLineChordLine, isTabLine: isNextLineTabLine } = linesWithInfo[
                i + 1
            ];
            if (isNextLineChordLine || isNextLineTabLine) {
                // two chord lines following - simply add current line to final
                final.push(line);
            } else {
                // current line is chord line and next one is not -> merge both lines into one, skip next line
                i++;
                final.push(...mergeChordsIntoLine(line, nextLine));
            }
        }
    }

    // loop once again (I swear we're almost done)
    // extract song parts
    let lastSongPart = null;
    for (let i = 0; i < final.length; i++) {
        const match = /\[([a-zA-Z1-9- ]+)\]\s*$/.exec(final[i]);
        if (match) {
            if (lastSongPart) {
                final.splice(i++, 0, songPartFromString(lastSongPart, true));
            }
            lastSongPart = match[1];
            final.splice(i, 1, songPartFromString(lastSongPart));
        }
    }
    if (lastSongPart) {
        final.push(songPartFromString(lastSongPart, true));
    }
    // at the moment we set capo and bpm to 0 because this is not on the page we are scraping the song from
    let ret = `# adapted from ultimate-guitar\n{t: ${song}}\n{artist: ${artist}}\n{capo: ${capo}}\n{bpm: ${bpm}}\n`;
    ret += final.join("\n").replace(/\[ch\](.*?)\[\/ch\]/gm, "[$1]");
    // finally, convert all [ch]..[/ch] to [..]
    return ret;
};

login();

// test func
// add () to the end if this should run
async () => {
    await login();
    const ret = await getUGChords("2935904");
    console.log(ugChordsToChopro(ret));
};

module.exports.getStatus = () => status;
module.exports.getUGChords = getUGChords;
module.exports.ugChordsToChopro = ugChordsToChopro;

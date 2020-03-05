import React, { useState, useEffect } from "react";
import { Form, ButtonGroup, OverlayTrigger, Tooltip } from "react-bootstrap";
import ContentEditable from "react-contenteditable";
import { FontAwesomeIcon as FAI } from "@fortawesome/react-fontawesome";
import ConfirmButton from "./ConfirmButton";
import sanitizeHtml from "sanitize-html";
import { useRef } from "react";
import { toast } from "react-toastify";

const highlightCho = data => {
    let dataHighlighted = data;
    // make comments green
    dataHighlighted = dataHighlighted.replace(/^(\s*#.*)$/gm, "<span class='green'>$1</span>");
    //make meta tags blue ({asdas} and {asd: asdad})
    dataHighlighted = dataHighlighted.replace(
        /{([^: ]+)}/gm,
        (full, key) => `<span class='bold'>{<span class='blue'>${key}</span>}</span>`
    );
    dataHighlighted = dataHighlighted.replace(
        /{(\S+):(.*)}/gm,
        (full, key, value) => `<span class='bold'>{<span class='blue'>${key}:</span>${value}}</span>`
    );
    // make chords red
    dataHighlighted = dataHighlighted.replace(/(\[[A-Z]\S*?\])/g, "<span class='red bold'>$1</span>");

    //make repeat symbols |: and :| bold
    dataHighlighted = dataHighlighted.replace(/(\|:|:\|)/g, "<span class='bold'>$1</span>");

    // make custom line break // yellow
    dataHighlighted = dataHighlighted.replace(/(\/\/\n)/g, "<span class='orange'>$1</span>");

    return dataHighlighted;
};

const highlightTex = data => {
    let dataHighlighted = data;
    // make comments green
    dataHighlighted = dataHighlighted.replace(/(%.*)$/gm, "<span class='green'>$1</span>");
    // make chords red
    dataHighlighted = dataHighlighted.replace(/([\^_]\*?\{[A-Z]\S*\})/g, "<span class='red'>$1</span>");
    //make commands blue (\begin{asd})
    dataHighlighted = dataHighlighted.replace(/(\\\S+?)(?=[{\s])/g, "<span class='bold blue'>$1</span>");
    // make keywords title={...} orange
    dataHighlighted = dataHighlighted.replace(/(\S+?=)(?=\{)/g, "<span class='orange'>$1</span>");
    // make brackets and everything in them bold
    dataHighlighted = dataHighlighted.replace(/(\{.*?})/g, "<span class='bold'>$1</span>");
    // make control structures ~ yellow
    dataHighlighted = dataHighlighted.replace(/(~)/g, "<span class='orange'>$1</span>");

    dataHighlighted = dataHighlighted.replace(/(\|:|:\|)/g, "<span class='bold'>$1</span>");

    return dataHighlighted;
};

function replaceSelectedChords() {
    var sel, range;
    const regex = /\^\{([A-Z]\S*)\}/g;
    if (window.getSelection) {
        sel = window.getSelection();
        let replacementText = sel.toString().replace(regex, "_{$1}");
        if (sel.rangeCount) {
            range = sel.getRangeAt(0);
            range.deleteContents();
            range.insertNode(document.createTextNode(replacementText));
        }
    } else if (document.selection && document.selection.createRange) {
        range = document.selection.createRange();
        range.text = range.text.replace(regex, "_{$1}");
    }
}

// mode is chopro or tex, needed for syntax highlighting
const TextEditor = ({ url, mode, text }) => {
    const [data, setData] = useState(null);
    const dataRef = useRef(data);
    dataRef.current = data;
    const [forceReload, setForceReload] = useState(0);

    // load data if url changed or reload forced
    useEffect(() => {
        const load = async () => {
            try {
                const r = await fetch(url);
                if (r.status === 404) {
                    return;
                }
                const d = await r.text();
                setData(sanitizeText(d));
            } catch (e) {
                // maybe set an error state
            }
        };
        if (text) {
            setData(sanitizeText(text));
        } else if (url) {
            setData(null);
            load();
        }
    }, [url, forceReload, text]);

    let highlight = data => data;
    if (mode === "cho") {
        highlight = highlightCho;
    } else if (mode === "tex") {
        highlight = highlightTex;
    }

    const sanitizeText = (data, forSave = false) => {
        // if sanitizing for save simply remove all tags
        let conf;
        if (forSave) {
            conf = {
                allowedTags: [],
                allowedAttributes: [],
                parser: {
                    decodeEntities: false
                }
            };
        } else {
            conf = {
                allowedTags: ["b", "i", "em", "strong", "h3", "span", "div"],
                allowedAttributes: { span: ["class"] },
                parser: {
                    decodeEntities: false
                }
            };
        }

        let san = sanitizeHtml(data, conf);
        if (forSave) {
            return san.replace(/&amp;/g, "&");
        }
        return highlight(san);
    };

    // Keyboard shortcuts!
    // ctrl+s saves the current file
    // ctrl+e converts selected chords from ^{} to _{}
    const handleKeyDown = (event, saveFunc) => {
        let charCode = String.fromCharCode(event.which).toLowerCase();
        if (event.ctrlKey && charCode === "s") {
            event.preventDefault();
            saveFunc();
        }
        if (event.ctrlKey && charCode === "e") {
            event.preventDefault();
            replaceSelectedChords();
        }

        // For MAC we can use metaKey to detect cmd key

        if (event.metaKey && charCode === "c") {
            if (event.metaKey && charCode === "s") {
                event.preventDefault();
                saveFunc();
            }
        }
        if (event.metaKey && charCode === "c") {
            if (event.metaKey && charCode === "e") {
                event.preventDefault();
                replaceSelectedChords();
            }
        }
    };
    const saveFile = async (url, data) => {
        // syntax highlight on save
        setData(sanitizeText(data));
        const toastId = toast("Saving...", { autoClose: 4000, type: "info" });
        const r = await fetch("/local/edit", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ filepath: url, content: data })
        });
        if (r.status === 200) {
            toast.update(toastId, { render: "Saved", type: "success" });
        } else {
            console.error(r);
            toast.update(toastId, { render: "Saving failed.", type: "error" });
        }
    };

    // // do syntax highlighting if data has not changed for a couple of milliseconds
    // useEffect(() => {
    //     const to = setTimeout(() => setData(sanitizeText(dataRef.current)), 300);
    //     return () => clearTimeout(to);
    // }, [data]);

    const saveCB = () => saveFile(url, sanitizeText(data.replace("<div>", "\n"), true));
    return (
        <Form onKeyDown={e => handleKeyDown(e, saveCB)} className="overflow-hidden parent-size flex">
            <div className="content overflow-hidden">
                {data !== null ? (
                    <>
                        <ButtonGroup>
                            <OverlayTrigger overlay={<Tooltip>Save these changes (CTRL+S)</Tooltip>}>
                                <ConfirmButton
                                    confirmText="Do you really want to save this file? Changes can not be reverted."
                                    title="Save"
                                    callback={saveCB}
                                >
                                    <FAI icon="save" />
                                </ConfirmButton>
                            </OverlayTrigger>
                            <OverlayTrigger overlay={<Tooltip>Undo these changes</Tooltip>}>
                                <ConfirmButton
                                    confirmText="Do you really want to reset this file? All changes will be deleted."
                                    title="Reset"
                                    callback={() => setForceReload(forceReload + 1)}
                                >
                                    <FAI icon="undo-alt" />
                                </ConfirmButton>
                            </OverlayTrigger>
                        </ButtonGroup>
                        <ContentEditable
                            html={data}
                            style={{ flex: 1, overflow: "scroll" }}
                            onChange={e => {
                                if (e.target.value !== data) setData(e.target.value);
                            }}
                            tagName="pre"
                            className="editText"
                        />
                    </>
                ) : (
                    "Loading..."
                )}
            </div>
        </Form>
    );
};

export default TextEditor;

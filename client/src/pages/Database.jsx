import React, { useState, useEffect } from "react";
import { Jumbotron, Card, Spinner } from "react-bootstrap";
import BootstrapTable from "react-bootstrap-table-next";
import cellEditFactory from "react-bootstrap-table2-editor";
import { toast } from "react-toastify";
import "react-bootstrap-table-next/dist/react-bootstrap-table2.min.css";

import FetchButton from "../components/FetchButton";

// cell rename handler
function beforeSaveCell(oldValue, newValue, row, column, done) {
    const rename = async () => {
        const toastId = toast("Saving...", { autoClose: 4000, type: "info" });
        const r = await fetch("/gdrive/editSong", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: row.SongID, column: column.dataField, newValue })
        });
        if (r.ok) {
            toast.update(toastId, { render: "Saved", type: "success" });
            done();
        } else {
            console.error(r);
            toast.update(toastId, { render: "Saving failed.", type: "error" });
            done(false);
        }
    };
    rename();
    return { async: true };
}

const Database = props => {
    const [songData, setSongData] = useState(null);
    const [forceReload, setForceReload] = useState(0);
    useEffect(() => {
        const loadUserData = async () => {
            const r = await fetch("/gdrive/songs");
            const d = await r.json();
            setSongData(d);
            console.log(d);
        };
        loadUserData();
    }, [forceReload]);

    if (!songData) {
        return (
            <Card>
                <Card.Title>All songs</Card.Title>
                <Card.Body>
                    <Spinner animation="border" />
                </Card.Body>
            </Card>
        );
    }

    let columns = ["SongID", "Title", "ArtistName"].map(key => {
        return {
            dataField: key,
            text: key,
            editable: key === "Title"
        };
    });
    columns = [
        ...columns,
        {
            dataField: "deleteCol",
            isDummyField: true,
            text: "Delete Song",
            formatter: (cell, row, rowIndex, { reload }) => (
                <FetchButton
                    url="/gdrive/deleteSong"
                    postBody={{ id: row.SongID }}
                    icon="trash"
                    processingStr="Deleting"
                    processedStr="Deleted"
                    onFetched={reload}
                />
            ),
            formatExtraData: { reload: () => setForceReload(forceReload + 1) }
        }
    ];

    return (
        <Card>
            <Card.Title>
                <h1>All songs</h1>
                <FetchButton
                    url="/gdrive/pushDB"
                    icon="save"
                    processingStr="Saving"
                    processedStr="Saved"
                    onFetched={() => setForceReload(forceReload + 1)}
                />
                <FetchButton
                    url="/gdrive/pullDB"
                    icon="undo-alt"
                    processingStr="Pulling from Drive"
                    onFetched={() => setForceReload(forceReload + 1)}
                />
            </Card.Title>
            <Card.Body>
                <BootstrapTable
                    columns={columns}
                    data={songData}
                    keyField="SongID"
                    bootstrap4
                    cellEdit={cellEditFactory({ mode: "dbclick", beforeSaveCell })}
                />
            </Card.Body>
        </Card>
    );
};

export default Database;

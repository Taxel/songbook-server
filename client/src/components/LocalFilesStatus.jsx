import React, { useState, useEffect } from "react";
import { Card, Container, Spinner, Table, OverlayTrigger, Tooltip } from "react-bootstrap";
import { FontAwesomeIcon as FAI } from "@fortawesome/react-fontawesome";

const iconColors = {
    check: "green",
    "check-double": "green",
    "ellipsis-h": "gray",
    spinner: "gray",
    exclamation: "red",
    circle: "yellow"
};

const SingleStatus = props => {
    const { in_progress, queued, last_run, text, start_date } = props;
    let secondsToDisplay = -1;
    if (in_progress) {
        secondsToDisplay = Math.floor((Date.now() - start_date) / 1000);
    } else if (last_run) {
        secondsToDisplay = last_run.elapsedSeconds;
    }
    let icon, tooltip;
    if (in_progress) {
        if (queued) {
            icon = "ellipsis-h";
            tooltip = "Running, queued to rerun after that";
        } else {
            icon = "spinner";
            tooltip = "Running";
        }
    } else {
        if (last_run) {
            if (last_run.failedFiles.length > 0) {
                icon = "exclamation";
                tooltip = `These ${last_run.failedFiles.length} files failed:\n${last_run.failedFiles.join("\n")}`;
            } else if (last_run.successfulFiles.length > 0) {
                icon = "check-double";
                tooltip = `These ${
                    last_run.successfulFiles.length
                } files were processed successfully:\n${last_run.successfulFiles.join("\n")}`;
            } else {
                icon = "check";
                tooltip = "No changed files detected";
            }
        } else {
            // should not happen
            icon = "circle";
            tooltip = "Task never ran";
        }
    }
    return (
        <tr>
            <td>
                <b>{text}</b>
            </td>
            <td>
                <OverlayTrigger overlay={<Tooltip>{tooltip}</Tooltip>}>
                    <div>
                        <FAI
                            icon={icon}
                            spin={icon === "spinner"}
                            color={iconColors[icon]}
                            style={{ width: "1em", margin: "0 0.2em" }}
                        />{" "}
                        {secondsToDisplay !== -1 && `${secondsToDisplay} s`}
                    </div>
                </OverlayTrigger>
            </td>
        </tr>
    );
};

const LocalFileStatus = props => {
    const { onStatusChange } = props;
    const [currentStatus, setCurrentStatus] = useState(null);
    const updateIntervalSeconds = 1;
    const statusStr = JSON.stringify(currentStatus);
    useEffect(() => {
        if (currentStatus != "null") {
            onStatusChange(currentStatus);
        }
    }, [statusStr]);

    const updateStatus = async () => {
        const r = await fetch("/local/status");
        const status = await r.json();
        if (JSON.stringify(status) !== statusStr) {
            setCurrentStatus(status);
        }
    };

    useEffect(() => {
        //updateStatus();
        const to = setInterval(updateStatus, updateIntervalSeconds * 1000);
        return () => {
            clearInterval(to);
        };
    }, []);
    return (
        <Card.Body>
            <Card.Title>Build status</Card.Title>
            {currentStatus ? (
                <Table size="sm">
                    <tbody>
                        <SingleStatus {...currentStatus.pdf} text="tex > pdf" />
                        <SingleStatus {...currentStatus.tex} text="chopro > tex" />
                    </tbody>
                </Table>
            ) : (
                <Spinner animation="border" />
            )}
        </Card.Body>
    );
};

export default LocalFileStatus;

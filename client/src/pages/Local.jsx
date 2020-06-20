import React, { useState, useEffect } from "react";
import { Row, Col, Card, Jumbotron, ToggleButton, ButtonGroup } from "react-bootstrap";
import { toast } from "react-toastify";
import VisibilitySensor from "react-visibility-sensor";
import LocalFileEdit from "../components/LocalFileEdit";
import LocalFileBrowser from "../components/LocalFileBrowser";
import LocalFileStatus from "../components/LocalFilesStatus";

const Local = props => {
    const [activeFile, setActiveFile] = useState(null);
    const [showBrowser, setShowBrowser] = useState(true);
    const [toastID, setToastID] = useState(null);
    const [isFileStatusVisible, setIsFileStatusVisible] = useState(true);
    const [forcePDFReload, setForcePDFReload] = useState(0);
    const [status, setStatus] = useState(null);

    let failedFiles = [];
    let successfulFiles = [];
    if (status) {
        if (status.pdf.last_run) {
            failedFiles = [...status.pdf.last_run.failedFiles];
            successfulFiles = [...status.pdf.last_run.successfulFiles];
        }
        if (status.tex.last_run) {
            failedFiles = [...failedFiles, ...status.tex.last_run.failedFiles];
            successfulFiles = [...successfulFiles, ...status.tex.last_run.successfulFiles];
        }
    }
    // instantiate status toast
    useEffect(() => {
        if (isFileStatusVisible) {
            // dismiss existing toast if exists
            if (toastID) {
                toast.dismiss(toastID);
                setToastID(null);
            }
        } else {
            // instantiate new toast
            const id = toast(<LocalFileStatus onStatusChange={newStatus => null} />, {
                draggable: true,
                position: toast.POSITION.BOTTOM_RIGHT,
                autoClose: false
            });
            setToastID(id);
        }
    }, [isFileStatusVisible]);
    return (
        <>
            <Jumbotron>
                <Row style={{ justifyContent: "space-around" }}>
                    <div>
                        Here you can view and edit all the files that are built on this server.
                        <br />
                        <br />
                        <ButtonGroup toggle>
                            <ToggleButton
                                onChange={() => setShowBrowser(!showBrowser)}
                                checked={showBrowser}
                                type="checkbox"
                            >
                                {showBrowser ? "Hide" : "Show"} song browser
                            </ToggleButton>
                        </ButtonGroup>
                    </div>
                    <VisibilitySensor onChange={visible => setIsFileStatusVisible(visible)}>
                        <Card>
                            <LocalFileStatus
                                onStatusChange={newStatus => {
                                    if (
                                        activeFile &&
                                        newStatus.pdf.last_run &&
                                        newStatus.pdf.last_run.successfulFiles.includes(activeFile.tex)
                                    ) {
                                        setForcePDFReload(forcePDFReload + 1);
                                    }
                                    setStatus(newStatus);
                                }}
                            />
                        </Card>
                    </VisibilitySensor>
                </Row>
            </Jumbotron>

            <Row style={{ flexGrow: 1 }}>
                {showBrowser && (
                    <Col
                        xs={true}
                        sm={6}
                        md={4}
                        lg={3}
                        xl={2}
                        style={{
                            display: "flex",
                            alignSelf: "flex-start",
                            position: "sticky",
                            top: "0px",
                            height: "100vh"
                        }}
                    >
                        <LocalFileBrowser
                            onSelect={selected => setActiveFile(selected)}
                            activeFileID={activeFile ? activeFile._id : null}
                            failedFiles={failedFiles}
                            successfulFiles={successfulFiles}
                        />
                    </Col>
                )}
                <Col
                    sm={!showBrowser ? true : 6}
                    md={!showBrowser ? true : 8}
                    lg={!showBrowser ? true : 9}
                    xl={!showBrowser ? true : 10}
                    style={{ display: "flex" }}
                >
                    {!activeFile ? (
                        <Card style={{ flex: 1 }}>
                            <Card.Body>Select a file to edit it here</Card.Body>
                        </Card>
                    ) : (
                        <LocalFileEdit {...activeFile} wide={!showBrowser} forceReload={forcePDFReload} />
                    )}
                </Col>
            </Row>
        </>
    );
};

export default Local;

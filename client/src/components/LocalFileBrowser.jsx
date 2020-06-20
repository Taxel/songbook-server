import React, { useState, useEffect } from "react";
import { Card, ListGroup, Spinner, Badge, Button, Form, Col } from "react-bootstrap";
import { FontAwesomeIcon as FAI } from "@fortawesome/react-fontawesome";

const searchFilter = ({ artistName, songName }, searchStr) => {
    return artistName.toLowerCase().includes(searchStr) || songName.toLowerCase().includes(searchStr);
};

const LocalFileItem = ({
    artistName,
    songName,
    choPath = null,
    failed = false,
    success = false,
    isActive = false,
    setActive = () => alert(1)
}) => (
    <ListGroup.Item
        as="li"
        active={isActive}
        action
        onClick={setActive}
        variant={failed ? "danger" : success ? "success" : "light"}
    >
        <b>{artistName}</b> - {songName}{" "}
        {choPath ? <Badge variant="primary">chopro</Badge> : <Badge variant="secondary">tex</Badge>}
    </ListGroup.Item>
);

const LocalFileBrowser = props => {
    const { onSelect, activeFileID, failedFiles = [], successfulFiles = [] } = props;
    const [data, setData] = useState([]);
    const [forceReloadCtr, setForceReloadCtr] = useState(0);
    const [searchStr, setSearchStr] = useState("");
    const [dataStatus, setDataStatus] = useState([]);

    useEffect(() => {
        // load files from server
        const loadFiles = async () => {
            const r = await fetch("/local/list");
            const d = await r.json();
            console.log(d);
            setData(d);
        };
        loadFiles();
    }, [forceReloadCtr]);

    useEffect(() => {
        console.log("refreshing data status");
        const newDataStatus = data.map(elem => ({
            failed: failedFiles.includes(elem.cho) || failedFiles.includes(elem.tex),
            success: successfulFiles.includes(elem.cho) || successfulFiles.includes(elem.tex)
        }));
        setDataStatus(newDataStatus);
    }, [JSON.stringify(failedFiles), JSON.stringify(successfulFiles), JSON.stringify(data)]);

    return (
        <Card style={{ flex: 1, display: "flex", overflow: "hidden" }}>
            <Card.Header>
                <Form>
                    <Form.Row>
                        <Col>
                            <Form.Control
                                placeholder="Search"
                                value={searchStr}
                                onChange={e => setSearchStr(e.target.value)}
                            />
                        </Col>
                        <Col md={2}>
                            <Button onClick={() => setForceReloadCtr(forceReloadCtr + 1)}>
                                <FAI icon="sync" />
                            </Button>
                        </Col>
                    </Form.Row>
                </Form>
            </Card.Header>
            <Card.Body
                style={{ flex: 1, overflow: "hidden scroll", display: "flex", position: "relative", padding: "0" }}
            >
                <div style={{ height: "100vh", position: "absolute" }}>
                    <ListGroup as="ul" variant="flush" style={{ margin: 0 }}>
                        {data.length > 0 ? (
                            data
                                .filter(f => searchFilter(f, searchStr.toLowerCase()))
                                .map((f, i) => (
                                    <LocalFileItem
                                        key={f._id}
                                        {...f}
                                        {...(dataStatus.length > i ? dataStatus[i] : {})}
                                        isActive={f._id === activeFileID}
                                        setActive={() => onSelect(f)}
                                    />
                                ))
                        ) : (
                            <ListGroup.Item>
                                <Spinner animation="border" />
                            </ListGroup.Item>
                        )}
                    </ListGroup>
                </div>
            </Card.Body>
        </Card>
    );
};

export default LocalFileBrowser;

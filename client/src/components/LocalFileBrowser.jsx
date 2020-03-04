import React, { useState, useEffect } from "react";
import { Card, ListGroup, Spinner, Badge, Button, Form, Col } from "react-bootstrap";
import { FontAwesomeIcon as FAI } from "@fortawesome/react-fontawesome";

const name_formatted = unformatted => {
    let [artist, title] = unformatted.split("-");
    artist = artist.split("_").join(" ");
    title = title.split("_").join(" ");
    return (
        <>
            <b>{artist}</b> {title}
        </>
    );
};

// transforms an object of {cho, tex, pdf} to an array with objects of that key
// expects each pdf to have corresponding tex and some tex to have corresponding cho
const transform = rawData => {
    const transformed = [];
    const { cho, tex, pdf } = rawData;
    let choIdx = 0;
    for (let i in pdf) {
        let ret = { pdf: pdf[i], tex: tex[i] };
        ret.filename = ret.pdf.slice(0, -4).toLowerCase();
        ret.formatted = name_formatted(ret.filename);
        // get filename without extension
        if (cho.length - 1 > choIdx && cho[choIdx].toLowerCase().startsWith(ret.filename)) {
            ret["cho"] = cho[choIdx];
            choIdx++;
        }
        transformed.push(ret);
    }
    if (choIdx !== cho.length - 1) {
        console.error("did not match all chopro files! no partner found for", cho[choIdx]);
    }
    return transformed;
};

const searchFilter = (filename, searchStr) => {
    return filename.toLowerCase().includes(searchStr);
};

const LocalFileItem = ({
    formatted,
    cho = null,
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
        {formatted} {cho ? <Badge variant="primary">chopro</Badge> : <Badge variant="secondary">tex</Badge>}
    </ListGroup.Item>
);

const LocalFileBrowser = props => {
    const { onSelect, activeFileName, failedFiles = [], successfulFiles = [] } = props;
    const [data, setData] = useState([]);
    const [forceReloadCtr, setForceReloadCtr] = useState(0);
    const [searchStr, setSearchStr] = useState("");
    const [dataStatus, setDataStatus] = useState([]);
    const searchStrTransformed = searchStr
        .split(" ")
        .join("_")
        .toLowerCase();

    useEffect(() => {
        // load files from server
        const loadFiles = async () => {
            const r = await fetch("/local/list");
            const d = await r.json();
            console.log(d);
            setData(transform(d));
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
                                .filter(f => searchFilter(f.filename, searchStrTransformed))
                                .map((f, i) => (
                                    <LocalFileItem
                                        key={f.filename}
                                        {...f}
                                        {...(dataStatus.length > i ? dataStatus[i] : {})}
                                        isActive={f.filename === activeFileName}
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

import React, { useState, useEffect } from "react";
import { Button, Tabs, Tab, Container, Col, Row } from "react-bootstrap";
import TextEditor from "./TextEditor";
import TabletPDFViewer from "./TabletPDFViewer";

const LocalFileEdit = ({ filename, pdfPath, texPath, choPath = null, wide = false, forceReload = 0 }) => {
    const [tabKey, setTabKey] = useState(!choPath ? "tex" : "chopro");

    // reset state when file changes
    useEffect(() => {
        setTabKey(!choPath ? "tex" : "chopro");
    }, [filename, choPath]);

    // two column layout - wide
    return (
        <Container fluid>
            <Row>
                <Col
                    md={wide ? 6 : true}
                    xl={6}
                    style={{
                        paddingLeft: 0,
                        paddingRight: 0,
                        maxWidth: "62vh" /* make sure the pdf fits the screen*/
                    }}
                >
                    <TabletPDFViewer url={`/files/pdf/${pdfPath}?r=${forceReload}`} refreshButton />
                </Col>
                <Col
                    md={wide ? 6 : true}
                    xl={6}
                    style={{ height: "100vh", overflow: "hidden", display: "flex", flexDirection: "column" }}
                >
                    <Tabs activeKey={tabKey} onSelect={setTabKey}>
                        <Tab
                            eventKey="chopro"
                            title="Chopro"
                            disabled={choPath === null}
                            className="content overflow-hidden"
                        >
                            {choPath && <TextEditor url={`/files/chopro/${choPath}`} mode="cho" />}
                        </Tab>
                        <Tab eventKey="tex" title="Tex" className="content overflow-hidden">
                            <TextEditor url={`/files/tex/${texPath}`} mode="tex" />
                        </Tab>
                    </Tabs>
                </Col>
            </Row>
        </Container>
    );
};

export default LocalFileEdit;

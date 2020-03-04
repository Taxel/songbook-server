import React, { useState } from "react";
import PDFViewer from "pdf-viewer-reactjs";
import { Spinner, Button, Fade, ButtonGroup } from "react-bootstrap";
import { FontAwesomeIcon as FAI } from "@fortawesome/react-fontawesome";
import fb64 from "fetch-base64-in-browser";
import "./css/TabletPDFViewer.css";
import { useEffect } from "react";

const NavBar = props => {
    // all the props a navbar can have.
    const {
        page,
        pages,
        // scale,
        // maxScale,
        // minScale,
        // rotationAngle,
        // hideZool,
        // hideRotation,
        handleNextClick,
        handlePrevClick,
        // handleZoomIn,
        // handleZoomOut,
        // handleResetZoom,
        // handleRotateLeft,
        // handleResetRotation,
        // handleRotateRight,
        showNav,
        handleReload,
        showReloadButton
    } = props;
    return (
        <Fade in={showNav}>
            <div className="pdfNavbar container">
                {showReloadButton && (
                    <Button onClick={handleReload} className="reloadBtn" variant="outline-secondary">
                        <FAI icon="sync" />
                    </Button>
                )}
                <ButtonGroup className="pageSelectBtns">
                    <Button disabled={page === 1} onClick={handlePrevClick} variant="outline-secondary">
                        <FAI icon="arrow-left" />
                    </Button>
                    <Button disabled variant="secondary">
                        {page} / {pages}
                    </Button>
                    <Button disabled={page === pages} onClick={handleNextClick} variant="outline-secondary">
                        <FAI icon="arrow-right" />
                    </Button>
                </ButtonGroup>
                {/* add a dummy element when the reload button is visible so flexbox puts page selection in the middle*/}
                {showReloadButton && (
                    <div style={{ opacity: 0 }}>
                        <Button className="reloadBtn" variant="outline-secondary">
                            <FAI icon="sync" />
                        </Button>
                    </div>
                )}
            </div>
        </Fade>
    );
};

const TabletPDFViewer = ({ url, refreshButton = false }) => {
    const [pdfReload, setPdfReload] = useState(0);
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState(null);
    const [showNavbar, setShowNavbar] = useState(true);

    useEffect(() => {
        const fetchPdf = async () => {
            try {
                const f = new fb64();
                const b64 = await f.fetch(url);

                setData(b64);
                setLoading(false);
            } catch (err) {
                console.error(err);
            }
        };
        fetchPdf();
        setLoading(true);
    }, [url, pdfReload]);

    return (
        <>
            <div className="tabletAspectRatio-container">
                {!loading ? (
                    <PDFViewer
                        document={{ base64: data }}
                        loader={<Spinner animation="border" />}
                        css="localPDF-wrapper"
                        canvasCss="localPDF-canvas"
                        navigation={props => (
                            <NavBar
                                {...props}
                                showNav={showNavbar}
                                showReloadButton={refreshButton}
                                handleReload={() => setPdfReload(pdfReload + 1)}
                            />
                        )}
                        onDocumentClick={() => setShowNavbar(!showNavbar)}
                        scale={1.8}
                        hideZoom
                        hideRotation
                    />
                ) : (
                    <div className="localPDF-wrapper">
                        <div style={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
                            <Spinner animation="border" />
                        </div>{" "}
                    </div>
                )}
            </div>
        </>
    );
};

export default TabletPDFViewer;

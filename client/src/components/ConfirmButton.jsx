import React, { useState } from "react";
import { Button, Modal } from "react-bootstrap";

const ConfirmButton = ({ callback, title = "SET_TITLE", confirmText = "SET_CONFIRM_TEXT", children }) => {
    const [showModal, setShowModal] = useState(false);
    return (
        <>
            <Button onClick={() => setShowModal(true)}>{children}</Button>
            <Modal show={showModal} onHide={() => setShowModal(false)}>
                <Modal.Header closeButton>
                    <Modal.Title>{title}</Modal.Title>
                </Modal.Header>
                <Modal.Body>{confirmText}</Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowModal(false)}>
                        Abort
                    </Button>
                    <Button
                        variant="primary"
                        onClick={() => {
                            setShowModal(false);
                            callback();
                        }}
                    >
                        Confirm
                    </Button>
                </Modal.Footer>
            </Modal>
        </>
    );
};

export default ConfirmButton;

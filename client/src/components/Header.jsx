import React from "react";
import { Navbar, Nav } from "react-bootstrap";
import { LinkContainer } from "react-router-bootstrap";

const Header = props => {
    return (
        <header>
            <Navbar bg="dark" variant="dark" className="header">
                <Navbar.Brand>Aalex' Songbook Server</Navbar.Brand>
                <Nav>
                    <LinkContainer to="/" exact>
                        <Nav.Link>Home</Nav.Link>
                    </LinkContainer>
                    <LinkContainer to="/local">
                        <Nav.Link>Local Files</Nav.Link>
                    </LinkContainer>
                    <LinkContainer to="/gdrive">
                        <Nav.Link>MobileSheetsPro Library</Nav.Link>
                    </LinkContainer>
                    <LinkContainer to="/about">
                        <Nav.Link>About</Nav.Link>
                    </LinkContainer>
                </Nav>
            </Navbar>
        </header>
    );
};

export default Header;

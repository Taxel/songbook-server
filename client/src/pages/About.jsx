import React from "react";
import { Jumbotron } from "react-bootstrap";
import { FontAwesomeIcon as FAI } from "@fortawesome/react-fontawesome";

const About = props => {
    return (
        <Jumbotron>
            <h1>About</h1>
            <p>This is an open-source project by Alexander Theimer. </p>
            <p>
                It lives at <FAI icon={["fab", "github"]} />{" "}
                <a href="https://github.com/Taxel/songbook-server">https://github.com/Taxel/songbook-server</a>{" "}
            </p>
        </Jumbotron>
    );
};

export default About;

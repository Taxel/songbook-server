import React from "react";

import { Jumbotron, Row } from "react-bootstrap";
import UltimateGuitar from "../components/UltimateGuitar";

const Welcome = props => {
    return (
        <>
            <Jumbotron>
                <h1>Welcome!</h1>
            </Jumbotron>
            <Row style={{ flexGrow: 1 }}>
                <UltimateGuitar />
            </Row>
        </>
    );
};
export default Welcome;

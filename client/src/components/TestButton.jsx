import React, { useState } from "react";
import { Button, Row, Col, Form, FormGroup, FormLabel, FormControl, Card } from "react-bootstrap";

const TestButton = props => {
    const [response, setResponse] = useState(null);
    const [select, setSelect] = useState("*");
    const [from, setFrom] = useState("Songs");
    const [where, setWhere] = useState("");
    return (
        <>
            <Form>
                <FormGroup>
                    <FormLabel>Select</FormLabel>
                    <FormControl text={select} onChange={e => setSelect(e.target.value)} />
                </FormGroup>
                <FormGroup>
                    <FormLabel>From</FormLabel>
                    <FormControl text={from} onChange={e => setFrom(e.target.value)} />
                </FormGroup>
                <FormGroup>
                    <FormLabel>Where</FormLabel>
                    <FormControl text={where} onChange={e => setWhere(e.target.value)} />
                </FormGroup>
                <Button
                    onClick={async () => {
                        let answer;
                        try {
                            const r = await fetch("/gdrive/db", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ select, from, where })
                            });
                            answer = await r.json();
                        } catch (e) {
                            answer = e;
                        }
                        setResponse(answer || "No result");
                    }}
                >
                    Click Me!
                </Button>
            </Form>

            <pre style={{ width: "80vw", wordWrap: "break-word", textAlign: "left" }}>
                {response && JSON.stringify(response, undefined, 2)}
            </pre>
        </>
    );
};

export default TestButton;

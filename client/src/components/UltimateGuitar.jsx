import React, { useState } from "react";
import { Card, InputGroup, FormControl, Container, Alert } from "react-bootstrap";
import { toast } from "react-toastify";
import FetchButton from "./FetchButton";
import TextEditor from "./TextEditor";

const UrlFromTitleArtist = (title, artist) => {
    return `/files/chopro/${artist.replace(/[^a-z0-9\.äÄüÜöÖ]/gi, "_")}-${title.replace(
        /[^a-z0-9\.äÄüÜöÖ]/gi,
        "_"
    )}.chopro`;
};

const UltimateGuitar = props => {
    const [url, setUrl] = useState("");
    const [song, setSong] = useState(null);

    return (
        <Card style={{ width: "100%" }}>
            <Card.Body>
                <Card.Title>Ultimate Guitar Importer</Card.Title>
                <InputGroup>
                    <FormControl
                        placeholder="ultimate-guitar.com link"
                        value={url}
                        onChange={e => setUrl(e.target.value)}
                    />
                    <InputGroup.Append>
                        <FetchButton
                            processingStr="Converting"
                            url={`/local/ugchopro?url=${url}`}
                            icon="play"
                            onFetched={async rawResponse => {
                                console.log(rawResponse);
                                const sng = await rawResponse.json();
                                setSong(sng);
                            }}
                        />
                    </InputGroup.Append>
                </InputGroup>
                <Container>
                    {song && (
                        <>
                            <Alert variant="success">
                                The song <b>{song.title}</b> by <b>{song.artist}</b> has been converted to chopro, but
                                it is not yet part of your library. For that, check the converted file below for errors,
                                unnecessary parts etc. and then press the save button.
                            </Alert>
                            <TextEditor text={song.text} mode="cho" url={UrlFromTitleArtist(song.title, song.artist)} />
                        </>
                    )}
                </Container>
            </Card.Body>
        </Card>
    );
};

export default UltimateGuitar;

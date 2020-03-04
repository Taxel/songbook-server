import React from "react";
import { Button } from "react-bootstrap";
import { FontAwesomeIcon as FAI } from "@fortawesome/react-fontawesome";
import { toast } from "react-toastify";

const FetchButton = props => {
    const {
        url,
        icon,
        processingStr = "Processing",
        processedStr = "Done.",
        onFetched = () => null,
        onError = err => console.error(err),
        postBody = null
    } = props;
    const onClick = async () => {
        const toastId = toast(processingStr + "...", { autoClose: 8000, type: "info" });
        try {
            let options =
                postBody === null
                    ? { method: "GET" }
                    : {
                          method: "POST",
                          headers: {
                              "Content-Type": "application/json"
                          },
                          body: JSON.stringify(postBody)
                      };
            console.log(options);
            const rawResponse = await fetch(url, options);
            if (rawResponse.ok) {
                toast.update(toastId, { render: processedStr, type: "success", autoClose: 2000 });
                onFetched(rawResponse);
            }
        } catch (err) {
            onError(err);
            toast.update(toastId, { render: processingStr + " failed.", type: "error", autoClose: 5000 });
        }
    };
    return (
        <Button onClick={onClick}>
            <FAI icon={icon} />
        </Button>
    );
};

export default FetchButton;

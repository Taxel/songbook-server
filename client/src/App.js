import React from "react";
import logo from "./logo.svg";
import TestButton from "./components/TestButton";
import "./App.css";

function App() {
    return (
        <div className="App">
            <h1>You made it! The client is running!</h1>
            <p>
                As you can see there is not a lot here yet. The only usable component of this is the server part, which
                does all its magic without any user prompt at the moment.
            </p>
            <TestButton />
        </div>
    );
}

export default App;

import React from "react";

import { BrowserRouter as Router, Switch, Route } from "react-router-dom";
import Header from "./components/Header";
import NotImplemented from "./pages/NotImplemented";
import About from "./pages/About";
import "./App.css";
import Local from "./pages/Local";
import { Container } from "react-bootstrap";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
// load icon library
import "./icons";
import Database from "./pages/Database";

function App() {
    toast.configure();
    return (
        <Router>
            <div className="App">
                <Header />
                <Container className="content" fluid>
                    <Switch>
                        <Route path="/gdrive">
                            <Database />
                        </Route>
                        <Route path="/local">
                            <Local />
                        </Route>
                        <Route path="/about">
                            <About />
                        </Route>
                        <Route path="/">
                            <NotImplemented />
                        </Route>
                    </Switch>
                </Container>
            </div>
        </Router>
    );
}

export default App;

import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";
import "./styles/themes.css";
import "./styles/legacy-master.css";
import "./styles/superset.css";

const rootElement = document.getElementById("root");

if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}

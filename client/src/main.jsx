import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { App } from "./App";
import { AuthProvider } from "./context/AuthContext";
import { ToastProvider } from "./context/ToastContext";
import { ActiveSessionProvider } from "./context/ActiveSessionContext";
import "./styles/main.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <ActiveSessionProvider>
          <ToastProvider>
            <App />
          </ToastProvider>
        </ActiveSessionProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);

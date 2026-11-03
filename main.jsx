import React from "react";
import { createRoot } from "react-dom/client";
import FocusFlow from "./FocusFlow.jsx";

window.storage ??= {
  async get(key) {
    const value = localStorage.getItem(key);
    return value === null ? null : { key, value };
  },
  async set(key, value) {
    localStorage.setItem(key, value);
  },
  async delete(key) {
    localStorage.removeItem(key);
  },
};

createRoot(document.getElementById("root")).render(<FocusFlow />);

import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles.css";
import "./mobile.css";

createRoot(document.getElementById("root")).render(<App runtime={{
  apiBase: import.meta.env.VITE_CONTENT_API_BASE_URL || "",
  feedbackBase: import.meta.env.VITE_FEEDBACK_API_BASE_URL || "",
  assetBase: import.meta.env.BASE_URL || "/",
  serverRendered: false,
}} />);

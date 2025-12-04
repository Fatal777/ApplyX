import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initSentry } from "./lib/sentry";

// Initialize Sentry first - before any other code runs
initSentry();

createRoot(document.getElementById("root")!).render(<App />);

// Dispatch event for pre-renderer to know when rendering is complete
document.dispatchEvent(new Event("render-event"));

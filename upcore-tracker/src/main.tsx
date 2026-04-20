import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

import { setBaseUrl } from "./api/custom-fetch";

// Connect frontend to backend API
setBaseUrl("https://upcore-club-tracker.onrender.com");

createRoot(document.getElementById("root")!).render(<App />);

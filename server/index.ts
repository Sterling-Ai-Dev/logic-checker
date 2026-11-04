import "dotenv/config"; // must be the first import - anthropicClient.ts reads process.env at module load time
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PORT } from "./config.js";
import { checkArgument } from "./checkArgument.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(express.json());
app.post("/api/check", checkArgument);

// Serves the Vite build in "production" mode. In dev this is inert - you're
// browsing the Vite dev server, not this one.
const distPath = path.resolve(__dirname, "../dist");
app.use(express.static(distPath));
// A route-less catch-all (not app.get("*", ...)) - Express 5's path-to-regexp
// rejects a bare "*" pattern at startup.
app.use((_req, res) => {
  res.sendFile(path.join(distPath, "index.html"));
});

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});

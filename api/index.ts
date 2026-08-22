import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

console.log("Server starting up in offline mode...");

const app = express();
app.set("trust proxy", 1);
const PORT = 3000;

app.use(express.json());

// Simple Health Check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// Setup Vite Dev server or Serve static distribution build
async function setupMiddlewares() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      if (fs.existsSync(path.join(distPath, "index.html"))) {
        res.sendFile(path.join(distPath, "index.html"));
      } else {
        res.status(404).send("Not Found");
      }
    });
  }
}

setupMiddlewares().then(() => {
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
});

export default app;

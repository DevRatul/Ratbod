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

// Explicit Service Worker and PWA routes to ensure /sw.js never 404s
app.get("/sw.js", (req, res) => {
  res.setHeader("Content-Type", "application/javascript");
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  const distSw = path.join(process.cwd(), "dist", "sw.js");
  const publicSw = path.join(process.cwd(), "public", "sw.js");
  if (fs.existsSync(distSw)) {
    return res.sendFile(distSw);
  } else if (fs.existsSync(publicSw)) {
    return res.sendFile(publicSw);
  } else {
    return res.send(`
      self.addEventListener('install', (e) => self.skipWaiting());
      self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
    `);
  }
});

app.get(/^\/workbox-[a-zA-Z0-9]+\.js$/, (req, res, next) => {
  const filename = req.path.replace(/^\//, '');
  const distFile = path.join(process.cwd(), "dist", filename);
  if (fs.existsSync(distFile)) {
    res.setHeader("Content-Type", "application/javascript");
    return res.sendFile(distFile);
  }
  next();
});

app.get("/registerSW.js", (req, res) => {
  res.setHeader("Content-Type", "application/javascript");
  const distReg = path.join(process.cwd(), "dist", "registerSW.js");
  if (fs.existsSync(distReg)) {
    return res.sendFile(distReg);
  }
  return res.send(`
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js', { scope: '/' });
      });
    }
  `);
});

// Firebase Auth Reverse Proxy to bypass iOS Safari / PWA ITP storage partitioning
app.all(["/__/auth/*", "/__/auth"], async (req, res) => {
  try {
    const targetUrl = `https://gen-lang-client-0766956210.firebaseapp.com${req.originalUrl}`;
    const headers: Record<string, string> = {};
    for (const [key, value] of Object.entries(req.headers)) {
      if (key.toLowerCase() !== 'host' && typeof value === 'string') {
        headers[key] = value;
      }
    }
    const response = await fetch(targetUrl, {
      method: req.method,
      headers,
      body: ['GET', 'HEAD'].includes(req.method) ? undefined : (typeof req.body === 'object' ? JSON.stringify(req.body) : req.body),
      redirect: 'manual'
    });

    res.status(response.status);
    response.headers.forEach((val, key) => {
      if (key.toLowerCase() !== 'content-encoding') {
        res.setHeader(key, val);
      }
    });
    const buffer = Buffer.from(await response.arrayBuffer());
    res.send(buffer);
  } catch (err: any) {
    console.error('Firebase Auth proxy error:', err);
    res.status(502).send('Auth proxy failed');
  }
});

// Setup Vite Dev server or Serve static distribution build
async function setupMiddlewares() {
  const distPath = path.join(process.cwd(), "dist");
  const isProd = process.env.NODE_ENV === "production" || fs.existsSync(path.join(distPath, "index.html"));

  if (!isProd) {
    console.log("Starting in development mode with Vite...");
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Starting in production mode, serving static files...");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      if (fs.existsSync(path.join(distPath, "index.html"))) {
        res.sendFile(path.join(distPath, "index.html"));
      } else {
        res.status(404).send("Not Found - Build missing");
      }
    });
  }
}

setupMiddlewares().then(() => {
  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
  
  server.on('error', (error) => {
    console.error('Server failed to start:', error);
  });
}).catch(err => {
  console.error("Failed to setup middlewares:", err);
});

export default app;

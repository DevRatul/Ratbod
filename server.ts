import express from "express";
import path from "path";
import fs from "fs";

console.log("Server starting up...");

const app = express();
app.set("trust proxy", 1);

// Determine execution mode
const isProduction =
  process.env.NODE_ENV === "production" ||
  process.env.npm_lifecycle_event === "start" ||
  Boolean(process.argv[1] && process.argv[1].includes("server.cjs"));

// In AI Studio development sandbox, nginx reverse proxy routes external traffic to port 3000.
// In Cloud Run production deployment, Cloud Run injects process.env.PORT (typically 8080) and expects the container to listen on it.
const PORT = isProduction
  ? (process.env.PORT ? parseInt(process.env.PORT, 10) : 8080)
  : 3000;

app.use(express.json());

// Cloud Run and API Health Check
app.get("/api/health", (req, res) => {
  res.status(200).json({ status: "ok", port: PORT, mode: isProduction ? "production" : "development" });
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

  if (!isProduction) {
    console.log("Starting in development mode with Vite...");
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Starting in production mode, serving static files from", distPath);
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      const indexPath = path.join(distPath, "index.html");
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(404).send("Not Found - Build missing");
      }
    });
  }
}

async function startServer() {
  await setupMiddlewares();
  
  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running in ${isProduction ? "PRODUCTION" : "DEVELOPMENT"} mode on http://0.0.0.0:${PORT}`);
  });

  server.on("error", (error: any) => {
    console.error("Server failed to start:", error);
  });

  // Graceful shutdown handling for Cloud Run
  process.on("SIGTERM", () => {
    console.log("SIGTERM received, closing HTTP server gracefully...");
    server.close(() => {
      console.log("HTTP server closed.");
      process.exit(0);
    });
  });
}

startServer().catch((err) => {
  console.error("Fatal error during server startup:", err);
  process.exit(1);
});

export default app;

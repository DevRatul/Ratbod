import express from "express";
import path from "path";
import fs from "fs";

// In AI Studio sandbox, HMR is disabled to avoid intermediate state flickering and websocket connection warnings
if (!process.env.DISABLE_HMR) {
  process.env.DISABLE_HMR = "true";
}

console.log("Server starting up...");

const app = express();
app.set("trust proxy", 1);

// Determine execution mode
const isProduction =
  process.env.NODE_ENV === "production" ||
  process.env.npm_lifecycle_event === "start" ||
  Boolean(process.argv[1] && process.argv[1].includes("server.cjs"));

// In AI Studio development sandbox and Cloud Run container, port 3000 is the standard port.
// Only override if process.env.PORT is explicitly provided by the container orchestrator.
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json());

// Cloud Run and API Health Check
app.get("/api/health", (req, res) => {
  res.status(200).json({ status: "ok", port: PORT, mode: isProduction ? "production" : "development" });
});

// Explicit Service Worker and PWA routes to ensure /sw.js never 404s and serves freshest worker
app.get("/sw.js", (req, res) => {
  res.setHeader("Content-Type", "application/javascript");
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  const publicSw = path.join(process.cwd(), "public", "sw.js");
  const distSw = path.join(process.cwd(), "dist", "sw.js");
  if (fs.existsSync(publicSw)) {
    return res.sendFile(publicSw);
  } else if (fs.existsSync(distSw)) {
    return res.sendFile(distSw);
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
      server: { 
        middlewareMode: true,
        hmr: false,
        ws: false
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Starting in production mode, serving static files from", distPath);
    app.use(express.static(distPath));
    const publicPath = path.join(process.cwd(), "public");
    if (fs.existsSync(publicPath)) {
      app.use(express.static(publicPath));
    }
    app.get("*", (req, res) => {
      const indexPath = path.join(distPath, "index.html");
      const fallbackPublicIndex = path.join(process.cwd(), "public", "index.html");
      if (fs.existsSync(indexPath)) {
        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        res.sendFile(indexPath);
      } else if (fs.existsSync(fallbackPublicIndex)) {
        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        res.sendFile(fallbackPublicIndex);
      } else {
        res.status(404).send("Not Found - Build missing");
      }
    });
  }

  // Global error handler to prevent unhandled express crashes or hung requests
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error("Unhandled server error:", err);
    if (!res.headersSent) {
      res.status(500).json({ error: "Internal server error occurred", message: err?.message || String(err) });
    }
  });
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

// Only launch standalone HTTP server if not running inside a serverless platform (e.g. Vercel)
if (!process.env.VERCEL) {
  startServer().catch((err) => {
    console.error("Fatal error during server startup:", err);
    process.exit(1);
  });
}

export default app;

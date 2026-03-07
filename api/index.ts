import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import cookieParser from "cookie-parser";
import multer from "multer";
import fs from "fs";

console.log("Server starting up...");
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = process.env.VERCEL ? "/tmp/ratbod.db" : "ratbod.db";
const JWT_SECRET = process.env.JWT_SECRET || "ratbod-secret-key-123";
let db: any;

try {
  console.log("Loading better-sqlite3...");
  const { default: Database } = await import("better-sqlite3");
  console.log(`Initializing database at ${dbPath}`);
  db = new Database(dbPath);
  
  // Initialize Database
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE,
      password TEXT,
      name TEXT,
      profilePic TEXT
    );

    CREATE TABLE IF NOT EXISTS metrics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER,
      date TEXT,
      gender TEXT,
      age INTEGER,
      height REAL,
      weight REAL,
      waist REAL,
      neck REAL,
      hip REAL,
      activityLevel TEXT,
      bmi REAL,
      bmr REAL,
      tdee REAL,
      bodyFat REAL,
      FOREIGN KEY(userId) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS goals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER,
      targetWeight REAL,
      targetBodyFat REAL,
      dailyCalorieGoal INTEGER,
      targetDate TEXT,
      FOREIGN KEY(userId) REFERENCES users(id)
    );
  `);
  console.log("Database initialized successfully");
} catch (error) {
  console.error("Database initialization failed:", error);
  // Fallback to in-memory if file fails (though /tmp should work)
  try {
    const { default: Database } = await import("better-sqlite3");
    db = new Database(":memory:");
    console.log("Fallback to in-memory database successful");
  } catch (innerError) {
    console.error("Critical error: better-sqlite3 could not be loaded at all:", innerError);
  }
}

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(cookieParser());

// Multer setup for profile pictures
const uploadDir = process.env.VERCEL ? "/tmp/uploads" : path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) {
  try {
    fs.mkdirSync(uploadDir, { recursive: true });
  } catch (err) {
    console.error("Failed to create upload directory:", err);
  }
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, "profile-" + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({ storage });

app.use("/uploads", express.static(uploadDir));

// Middleware to verify JWT
const authenticate = (req: any, res: any, next: any) => {
  const token = req.cookies.token;
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: "Invalid token" });
  }
};

// Auth Routes
app.get("/api/users", (req, res) => {
  const users = db.prepare("SELECT id, username, name, profilePic FROM users").all();
  res.json(users);
});

app.post("/api/users/switch", (req, res) => {
  const { id } = req.body;
  const user: any = db.prepare("SELECT * FROM users WHERE id = ?").get(id);

  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: "7d" });
  res.cookie("token", token, { httpOnly: true, secure: true, sameSite: "none" });
  res.json({ id: user.id, username: user.username, name: user.name, profilePic: user.profilePic });
});

app.post("/api/users/create", (req, res) => {
  const { name } = req.body;
  const username = `user_${Date.now()}`;
  const password = "default_password"; // Not really used if we switch via ID
  const hashedPassword = bcrypt.hashSync(password, 10);

  try {
    const stmt = db.prepare("INSERT INTO users (username, password, name) VALUES (?, ?, ?)");
    const info = stmt.run(username, hashedPassword, name || username);
    const newUser: any = db.prepare("SELECT id, username, name, profilePic FROM users WHERE id = ?").get(info.lastInsertRowid);
    
    // Automatically log in as the new user
    const token = jwt.sign({ id: newUser.id, username: newUser.username }, JWT_SECRET, { expiresIn: "7d" });
    res.cookie("token", token, { httpOnly: true, secure: true, sameSite: "none" });
    
    res.json(newUser);
  } catch (err: any) {
    res.status(400).json({ error: "Failed to create user" });
  }
});

app.post("/api/users/delete", authenticate, (req: any, res) => {
  const { id } = req.body;
  db.prepare("DELETE FROM metrics WHERE userId = ?").run(id);
  db.prepare("DELETE FROM goals WHERE userId = ?").run(id);
  db.prepare("DELETE FROM users WHERE id = ?").run(id);
  if (req.user.id === id) {
    res.clearCookie("token");
  }
  res.json({ success: true });
});

app.post("/api/logout", (req, res) => {
  res.clearCookie("token");
  res.json({ success: true });
});

app.get("/api/me", authenticate, (req: any, res) => {
  const user: any = db.prepare("SELECT id, username, name, profilePic FROM users WHERE id = ?").get(req.user.id);
  res.json(user);
});

app.post("/api/users/delete", authenticate, (req: any, res) => {
  const { id } = req.body;
  
  // Don't allow deleting yourself if you are the only one? Or just allow it.
  // Actually, let's just allow it.
  
  db.prepare("DELETE FROM metrics WHERE userId = ?").run(id);
  db.prepare("DELETE FROM goals WHERE userId = ?").run(id);
  db.prepare("DELETE FROM users WHERE id = ?").run(id);
  
  if (req.user.id === id) {
    res.clearCookie("token");
  }
  
  res.json({ success: true });
});

// User Profile Routes
app.post("/api/profile", authenticate, upload.single("profilePic"), (req: any, res) => {
  const { name } = req.body;
  const profilePic = req.file ? `/uploads/${req.file.filename}` : undefined;

  if (profilePic) {
    db.prepare("UPDATE users SET name = ?, profilePic = ? WHERE id = ?").run(name, profilePic, req.user.id);
  } else {
    db.prepare("UPDATE users SET name = ? WHERE id = ?").run(name, req.user.id);
  }

  const user: any = db.prepare("SELECT id, username, name, profilePic FROM users WHERE id = ?").get(req.user.id);
  res.json(user);
});

// Metrics Routes
app.post("/api/metrics", authenticate, (req: any, res) => {
  const { gender, age, height, weight, waist, neck, hip, activityLevel, bmi, bmr, tdee, bodyFat } = req.body;
  const date = new Date().toISOString();

  const stmt = db.prepare(`
    INSERT INTO metrics (userId, date, gender, age, height, weight, waist, neck, hip, activityLevel, bmi, bmr, tdee, bodyFat)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(req.user.id, date, gender, age, height, weight, waist, neck, hip, activityLevel, bmi, bmr, tdee, bodyFat);
  res.json({ success: true });
});

app.get("/api/metrics", authenticate, (req: any, res) => {
  const metrics = db.prepare("SELECT * FROM metrics WHERE userId = ? ORDER BY date DESC").all(req.user.id);
  res.json(metrics);
});

// Goals Routes
app.get("/api/goals", authenticate, (req: any, res) => {
  const goal = db.prepare("SELECT * FROM goals WHERE userId = ? ORDER BY id DESC LIMIT 1").get(req.user.id);
  res.json(goal || null);
});

app.post("/api/goals", authenticate, (req: any, res) => {
  const { targetWeight, targetBodyFat, dailyCalorieGoal, targetDate } = req.body;
  
  const existingGoal = db.prepare("SELECT id FROM goals WHERE userId = ?").get(req.user.id);
  
  if (existingGoal) {
    db.prepare(`
      UPDATE goals 
      SET targetWeight = ?, targetBodyFat = ?, dailyCalorieGoal = ?, targetDate = ?
      WHERE userId = ?
    `).run(targetWeight, targetBodyFat, dailyCalorieGoal, targetDate, req.user.id);
  } else {
    db.prepare(`
      INSERT INTO goals (userId, targetWeight, targetBodyFat, dailyCalorieGoal, targetDate)
      VALUES (?, ?, ?, ?, ?)
    `).run(req.user.id, targetWeight, targetBodyFat, dailyCalorieGoal, targetDate);
  }
  
  res.json({ success: true });
});

// Global error handler
app.use((err: any, req: any, res: any, next: any) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal server error" });
});

async function setupMiddlewares() {
  // On Vercel, we don't need to serve static files or run Vite
  // because Vercel handles routing and static assets via vercel.json
  if (process.env.VERCEL) {
    console.log("Running on Vercel, skipping Vite/Static middleware");
    return;
  }

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "..", "dist")));
    app.get("*", (req, res) => {
      if (fs.existsSync(path.join(__dirname, "..", "dist", "index.html"))) {
        res.sendFile(path.join(__dirname, "..", "dist", "index.html"));
      } else {
        res.status(404).send("Not Found");
      }
    });
  }
}

// Initialize middlewares
setupMiddlewares().then(() => {
  console.log("Middlewares initialized");
}).catch(err => {
  console.error("Failed to initialize middlewares:", err);
});

async function startServer() {
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

// Export for Vercel
export default app;

if (process.env.NODE_ENV !== "production" && !process.env.VERCEL) {
  startServer();
} else if (!process.env.VERCEL) {
  startServer();
}

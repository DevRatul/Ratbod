import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import cookieParser from "cookie-parser";
import multer from "multer";
import fs from "fs";
import { createClient } from "@supabase/supabase-js";

console.log("Server starting up...");
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = process.env.VERCEL ? "/tmp/ratbod.db" : "ratbod.db";
const JWT_SECRET = process.env.JWT_SECRET || "ratbod-secret-key-123";

// Supabase Configuration
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

let supabase: any;
if (supabaseUrl && supabaseServiceKey) {
  console.log("Initializing Supabase client...");
  supabase = createClient(supabaseUrl, supabaseServiceKey);
} else {
  console.warn("Supabase credentials missing. Falling back to SQLite.");
}

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
      profilePic TEXT,
      birthdate TEXT,
      gender TEXT
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

  // Migration: Add birthdate column if it doesn't exist
  try {
    db.exec("ALTER TABLE users ADD COLUMN birthdate TEXT;");
    console.log("Migration: Added birthdate column to users table");
  } catch (err: any) {
    if (err.message.includes("duplicate column name")) {
      console.log("Migration: birthdate column already exists");
    } else {
      console.error("Migration failed:", err);
    }
  }

  // Migration: Add gender column if it doesn't exist
  try {
    db.exec("ALTER TABLE users ADD COLUMN gender TEXT;");
    console.log("Migration: Added gender column to users table");
  } catch (err: any) {
    if (err.message.includes("duplicate column name")) {
      console.log("Migration: gender column already exists");
    } else {
      console.error("Migration failed:", err);
    }
  }

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
app.set("trust proxy", 1);
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
app.post("/api/register", async (req, res) => {
  const { username, password, name, birthdate, gender } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: "Username and password are required" });
  }

  const hashedPassword = bcrypt.hashSync(password, 10);

  if (supabase) {
    const { data, error } = await supabase
      .from("users")
      .insert({ username, password: hashedPassword, name: name || username, birthdate: birthdate || null, gender: gender || null })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return res.status(400).json({ error: "Username already exists" });
      }
      return res.status(400).json({ error: "Registration failed: " + error.message });
    }
    return res.json({ success: true });
  }

  try {
    const stmt = db.prepare("INSERT INTO users (username, password, name, birthdate, gender) VALUES (?, ?, ?, ?, ?)");
    stmt.run(username, hashedPassword, name || username, birthdate || null, gender || null);
    res.json({ success: true });
  } catch (err: any) {
    if (err.message.includes("UNIQUE constraint failed")) {
      return res.status(400).json({ error: "Username already exists" });
    }
    res.status(400).json({ error: "Registration failed" });
  }
});

app.post("/api/login", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: "Username and password are required" });
  }

  let user: any;
  if (supabase) {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("username", username)
      .single();
    
    if (error || !data) {
      return res.status(401).json({ error: "Invalid username or password" });
    }
    user = data;
  } else {
    user = db.prepare("SELECT * FROM users WHERE username = ?").get(username);
  }

  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: "Invalid username or password" });
  }

  const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: "7d" });
  res.cookie("token", token, { httpOnly: true, secure: true, sameSite: "none" });
  res.json({ id: user.id, username: user.username, name: user.name, profilePic: user.profilePic, birthdate: user.birthdate, gender: user.gender });
});

app.get("/api/users", async (req, res) => {
  if (supabase) {
    const { data, error } = await supabase
      .from("users")
      .select("id, username, name, profilePic");
    if (error) return res.status(400).json({ error: error.message });
    return res.json(data);
  }
  const users = db.prepare("SELECT id, username, name, profilePic FROM users").all();
  res.json(users);
});

app.post("/api/users/switch", async (req, res) => {
  const { id } = req.body;
  let user: any;
  if (supabase) {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("id", id)
      .single();
    if (error || !data) return res.status(404).json({ error: "User not found" });
    user = data;
  } else {
    user = db.prepare("SELECT * FROM users WHERE id = ?").get(id);
  }

  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: "7d" });
  res.cookie("token", token, { httpOnly: true, secure: true, sameSite: "none" });
  res.json({ id: user.id, username: user.username, name: user.name, profilePic: user.profilePic, birthdate: user.birthdate, gender: user.gender });
});

app.post("/api/users/create", async (req, res) => {
  const { name, birthdate, gender } = req.body;
  const username = `user_${Date.now()}`;
  const password = "default_password"; // Not really used if we switch via ID
  const hashedPassword = bcrypt.hashSync(password, 10);

  if (supabase) {
    const { data, error } = await supabase
      .from("users")
      .insert({ username, password: hashedPassword, name: name || username, birthdate: birthdate || null, gender: gender || null })
      .select("id, username, name, profilePic, birthdate, gender")
      .single();
    
    if (error) return res.status(400).json({ error: error.message });
    
    // Automatically log in as the new user
    const token = jwt.sign({ id: data.id, username: data.username }, JWT_SECRET, { expiresIn: "7d" });
    res.cookie("token", token, { httpOnly: true, secure: true, sameSite: "none" });
    
    return res.json(data);
  }

  try {
    const stmt = db.prepare("INSERT INTO users (username, password, name, birthdate, gender) VALUES (?, ?, ?, ?, ?)");
    const info = stmt.run(username, hashedPassword, name || username, birthdate || null, gender || null);
    const newUser: any = db.prepare("SELECT id, username, name, profilePic, birthdate, gender FROM users WHERE id = ?").get(info.lastInsertRowid);
    
    // Automatically log in as the new user
    const token = jwt.sign({ id: newUser.id, username: newUser.username }, JWT_SECRET, { expiresIn: "7d" });
    res.cookie("token", token, { httpOnly: true, secure: true, sameSite: "none" });
    
    res.json(newUser);
  } catch (err: any) {
    res.status(400).json({ error: "Failed to create user" });
  }
});

app.post("/api/users/delete", authenticate, async (req: any, res) => {
  const { id } = req.body;
  if (supabase) {
    await supabase.from("metrics").delete().eq("userId", id);
    await supabase.from("goals").delete().eq("userId", id);
    await supabase.from("users").delete().eq("id", id);
  } else {
    db.prepare("DELETE FROM metrics WHERE userId = ?").run(id);
    db.prepare("DELETE FROM goals WHERE userId = ?").run(id);
    db.prepare("DELETE FROM users WHERE id = ?").run(id);
  }
  if (req.user.id === id) {
    res.clearCookie("token");
  }
  res.json({ success: true });
});

app.post("/api/logout", (req, res) => {
  res.clearCookie("token");
  res.json({ success: true });
});

app.get("/api/me", authenticate, async (req: any, res) => {
  let user: any;
  if (supabase) {
    const { data, error } = await supabase
      .from("users")
      .select("id, username, name, profilePic, birthdate, gender")
      .eq("id", req.user.id)
      .single();
    if (error) return res.status(400).json({ error: error.message });
    user = data;
  } else {
    user = db.prepare("SELECT id, username, name, profilePic, birthdate, gender FROM users WHERE id = ?").get(req.user.id);
  }
  res.json(user);
});

// User Profile Routes
app.post("/api/profile", authenticate, upload.single("profilePic"), async (req: any, res) => {
  const { name, birthdate, gender } = req.body;
  const profilePic = req.file ? `/uploads/${req.file.filename}` : undefined;

  if (supabase) {
    const updateData: any = { name, birthdate, gender };
    if (profilePic) updateData.profilePic = profilePic;
    
    const { data, error } = await supabase
      .from("users")
      .update(updateData)
      .eq("id", req.user.id)
      .select("id, username, name, profilePic, birthdate, gender")
      .single();
    
    if (error) return res.status(400).json({ error: error.message });
    return res.json(data);
  }

  if (profilePic) {
    db.prepare("UPDATE users SET name = ?, profilePic = ?, birthdate = ?, gender = ? WHERE id = ?").run(name, profilePic, birthdate, gender, req.user.id);
  } else {
    db.prepare("UPDATE users SET name = ?, birthdate = ?, gender = ? WHERE id = ?").run(name, birthdate, gender, req.user.id);
  }

  const user: any = db.prepare("SELECT id, username, name, profilePic, birthdate, gender FROM users WHERE id = ?").get(req.user.id);
  res.json(user);
});

// Metrics Routes
app.post("/api/metrics", authenticate, async (req: any, res) => {
  const { gender, age, height, weight, waist, neck, hip, activityLevel, bmi, bmr, tdee, bodyFat } = req.body;
  const date = new Date().toISOString();

  if (supabase) {
    const { error } = await supabase
      .from("metrics")
      .insert({ userId: req.user.id, date, gender, age, height, weight, waist, neck, hip, activityLevel, bmi, bmr, tdee, bodyFat });
    if (error) return res.status(400).json({ error: error.message });
    return res.json({ success: true });
  }

  const stmt = db.prepare(`
    INSERT INTO metrics (userId, date, gender, age, height, weight, waist, neck, hip, activityLevel, bmi, bmr, tdee, bodyFat)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(req.user.id, date, gender, age, height, weight, waist, neck, hip, activityLevel, bmi, bmr, tdee, bodyFat);
  res.json({ success: true });
});

app.get("/api/metrics", authenticate, async (req: any, res) => {
  if (supabase) {
    const { data, error } = await supabase
      .from("metrics")
      .select("*")
      .eq("userId", req.user.id)
      .order("date", { ascending: false });
    if (error) return res.status(400).json({ error: error.message });
    return res.json(data);
  }
  const metrics = db.prepare("SELECT * FROM metrics WHERE userId = ? ORDER BY date DESC").all(req.user.id);
  res.json(metrics);
});

app.delete("/api/metrics/:id", authenticate, async (req: any, res) => {
  const { id } = req.params;
  if (supabase) {
    const { error } = await supabase
      .from("metrics")
      .delete()
      .eq("id", id)
      .eq("userId", req.user.id);
    if (error) return res.status(400).json({ error: error.message });
    return res.json({ success: true });
  }
  const stmt = db.prepare("DELETE FROM metrics WHERE id = ? AND userId = ?");
  const info = stmt.run(Number(id), req.user.id);
  
  if (info.changes === 0) {
    return res.status(404).json({ error: "Metric not found or unauthorized" });
  }
  
  res.json({ success: true });
});

// Goals Routes
app.get("/api/goals", authenticate, async (req: any, res) => {
  if (supabase) {
    const { data, error } = await supabase
      .from("goals")
      .select("*")
      .eq("userId", req.user.id)
      .order("id", { ascending: false })
      .limit(1)
      .single();
    if (error && error.code !== "PGRST116") return res.status(400).json({ error: error.message });
    return res.json(data || null);
  }
  const goal = db.prepare("SELECT * FROM goals WHERE userId = ? ORDER BY id DESC LIMIT 1").get(req.user.id);
  res.json(goal || null);
});

app.post("/api/goals", authenticate, async (req: any, res) => {
  const { targetWeight, targetBodyFat, dailyCalorieGoal, targetDate } = req.body;
  
  if (supabase) {
    const { data: existingGoal } = await supabase
      .from("goals")
      .select("id")
      .eq("userId", req.user.id)
      .single();
    
    if (existingGoal) {
      const { error } = await supabase
        .from("goals")
        .update({ targetWeight, targetBodyFat, dailyCalorieGoal, targetDate })
        .eq("userId", req.user.id);
      if (error) return res.status(400).json({ error: error.message });
    } else {
      const { error } = await supabase
        .from("goals")
        .insert({ userId: req.user.id, targetWeight, targetBodyFat, dailyCalorieGoal, targetDate });
      if (error) return res.status(400).json({ error: error.message });
    }
    return res.json({ success: true });
  }

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

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

const JWT_SECRET = process.env.JWT_SECRET || "ratbod-secret-key-123";

// Supabase Configuration
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("CRITICAL ERROR: Supabase credentials missing (VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY).");
  console.error("Please set these in the AI Studio Settings menu.");
}

const supabase = createClient(supabaseUrl || "", supabaseServiceKey || "");

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
app.post("/api/register", async (req, res, next) => {
  try {
    const { username, password, name, birthdate, gender } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: "Username and password are required" });
    }

    const hashedPassword = bcrypt.hashSync(password, 10);

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
  } catch (err) {
    next(err);
  }
});

app.post("/api/login", async (req, res, next) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: "Username and password are required" });
    }

    const { data: user, error } = await supabase
      .from("users")
      .select("*")
      .eq("username", username)
      .single();
    
    if (error || !user) {
      return res.status(401).json({ error: "Invalid username or password" });
    }

    if (!bcrypt.compareSync(password, user.password)) {
      return res.status(401).json({ error: "Invalid username or password" });
    }

    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: "7d" });
    res.cookie("token", token, { httpOnly: true, secure: true, sameSite: "none" });
    res.json({ id: user.id, username: user.username, name: user.name, profilePic: user.profilePic, birthdate: user.birthdate, gender: user.gender });
  } catch (err) {
    next(err);
  }
});

app.get("/api/users", async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from("users")
      .select("id, username, name, profilePic");
    if (error) return res.status(400).json({ error: error.message });
    return res.json(data);
  } catch (err) {
    next(err);
  }
});

app.post("/api/users/switch", async (req, res, next) => {
  try {
    const { id } = req.body;
    const { data: user, error } = await supabase
      .from("users")
      .select("*")
      .eq("id", id)
      .single();
    
    if (error || !user) return res.status(404).json({ error: "User not found" });

    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: "7d" });
    res.cookie("token", token, { httpOnly: true, secure: true, sameSite: "none" });
    res.json({ id: user.id, username: user.username, name: user.name, profilePic: user.profilePic, birthdate: user.birthdate, gender: user.gender });
  } catch (err) {
    next(err);
  }
});

app.post("/api/users/create", async (req, res, next) => {
  try {
    const { name, birthdate, gender } = req.body;
    const username = `user_${Date.now()}`;
    const password = "default_password";
    const hashedPassword = bcrypt.hashSync(password, 10);

    const { data, error } = await supabase
      .from("users")
      .insert({ username, password: hashedPassword, name: name || username, birthdate: birthdate || null, gender: gender || null })
      .select("id, username, name, profilePic, birthdate, gender")
      .single();
    
    if (error) return res.status(400).json({ error: error.message });
    
    const token = jwt.sign({ id: data.id, username: data.username }, JWT_SECRET, { expiresIn: "7d" });
    res.cookie("token", token, { httpOnly: true, secure: true, sameSite: "none" });
    
    return res.json(data);
  } catch (err) {
    next(err);
  }
});

app.post("/api/users/delete", authenticate, async (req: any, res, next) => {
  try {
    const { id } = req.body;
    await supabase.from("metrics").delete().eq("userId", id);
    await supabase.from("goals").delete().eq("userId", id);
    await supabase.from("users").delete().eq("id", id);
    
    if (req.user.id === id) {
      res.clearCookie("token");
    }
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

app.post("/api/logout", (req, res) => {
  res.clearCookie("token");
  res.json({ success: true });
});

app.get("/api/me", authenticate, async (req: any, res, next) => {
  try {
    const { data: user, error } = await supabase
      .from("users")
      .select("id, username, name, profilePic, birthdate, gender")
      .eq("id", req.user.id)
      .single();
    if (error) return res.status(400).json({ error: error.message });
    res.json(user);
  } catch (err) {
    next(err);
  }
});

app.post("/api/profile", authenticate, upload.single("profilePic"), async (req: any, res, next) => {
  try {
    const { name, birthdate, gender } = req.body;
    const profilePic = req.file ? `/uploads/${req.file.filename}` : undefined;

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
  } catch (err) {
    next(err);
  }
});

app.post("/api/metrics", authenticate, async (req: any, res, next) => {
  try {
    const { gender, age, height, weight, waist, neck, hip, activityLevel, bmi, bmr, tdee, bodyFat } = req.body;
    const date = new Date().toISOString();

    const { error } = await supabase
      .from("metrics")
      .insert({ userId: req.user.id, date, gender, age, height, weight, waist, neck, hip, activityLevel, bmi, bmr, tdee, bodyFat });
    if (error) return res.status(400).json({ error: error.message });
    return res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

app.get("/api/metrics", authenticate, async (req: any, res, next) => {
  try {
    const { data, error } = await supabase
      .from("metrics")
      .select("*")
      .eq("userId", req.user.id)
      .order("date", { ascending: false });
    if (error) return res.status(400).json({ error: error.message });
    return res.json(data);
  } catch (err) {
    next(err);
  }
});

app.delete("/api/metrics/:id", authenticate, async (req: any, res, next) => {
  try {
    const { id } = req.params;
    const { error } = await supabase
      .from("metrics")
      .delete()
      .eq("id", id)
      .eq("userId", req.user.id);
    if (error) return res.status(400).json({ error: error.message });
    return res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

app.get("/api/goals", authenticate, async (req: any, res, next) => {
  try {
    const { data, error } = await supabase
      .from("goals")
      .select("*")
      .eq("userId", req.user.id)
      .order("id", { ascending: false })
      .limit(1)
      .single();
    if (error && error.code !== "PGRST116") return res.status(400).json({ error: error.message });
    return res.json(data || null);
  } catch (err) {
    next(err);
  }
});

app.post("/api/goals", authenticate, async (req: any, res, next) => {
  try {
    const { targetWeight, targetBodyFat, dailyCalorieGoal, targetDate } = req.body;
    
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
  } catch (err) {
    next(err);
  }
});

// Global error handler
app.use((err: any, req: any, res: any, next: any) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal server error" });
});

async function setupMiddlewares() {
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

export default app;

if (process.env.NODE_ENV !== "production" && !process.env.VERCEL) {
  startServer();
} else if (!process.env.VERCEL) {
  startServer();
}

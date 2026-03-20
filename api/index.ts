import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import cookieParser from "cookie-parser";
import multer from "multer";
import fs from "fs";
import * as admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import firebaseConfig from "../firebase-applet-config.json";

console.log("Server starting up...");
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const JWT_SECRET = process.env.JWT_SECRET || "ratbod-secret-key-123";

// Firebase Admin Configuration
const adminApp = !admin.apps.length 
  ? admin.initializeApp({ projectId: firebaseConfig.projectId })
  : admin.app();

const db = getFirestore(adminApp, firebaseConfig.firestoreDatabaseId);

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

    const userQuery = await db.collection("users").where("username", "==", username).get();
    if (!userQuery.empty) {
      return res.status(400).json({ error: "Username already exists" });
    }

    const hashedPassword = bcrypt.hashSync(password, 10);
    const userRef = db.collection("users").doc();
    const userData = {
      id: userRef.id,
      username,
      password: hashedPassword,
      name: name || username,
      birthdate: birthdate || null,
      gender: gender || null,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    };

    await userRef.set(userData);

    const token = jwt.sign({ id: userData.id, username: userData.username }, JWT_SECRET, { expiresIn: "7d" });
    res.cookie("token", token, { 
      httpOnly: true, 
      secure: true, 
      sameSite: "none",
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    const { password: _, ...userWithoutPassword } = userData;
    return res.json(userWithoutPassword);
  } catch (err) {
    console.error("Registration route error:", err);
    res.status(500).json({ error: "Internal server error during registration" });
  }
});

app.post("/api/login", async (req, res, next) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: "Username and password are required" });
    }

    const userQuery = await db.collection("users").where("username", "==", username).get();
    if (userQuery.empty) {
      return res.status(401).json({ error: "Invalid username or password" });
    }

    const userDoc = userQuery.docs[0];
    const user = userDoc.data();

    if (!bcrypt.compareSync(password, user.password)) {
      return res.status(401).json({ error: "Invalid username or password" });
    }

    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: "7d" });
    res.cookie("token", token, { 
      httpOnly: true, 
      secure: true, 
      sameSite: "none",
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });
    const { password: _, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  } catch (err) {
    console.error("Login route error:", err);
    res.status(500).json({ error: "Internal server error during login" });
  }
});

app.get("/api/users", async (req, res, next) => {
  try {
    const snapshot = await db.collection("users").get();
    const users = snapshot.docs.map(doc => {
      const data = doc.data();
      return { id: data.id, username: data.username, name: data.name, profilePic: data.profilePic };
    });
    return res.json(users);
  } catch (err) {
    next(err);
  }
});

app.post("/api/users/switch", async (req, res, next) => {
  try {
    const { id } = req.body;
    const userDoc = await db.collection("users").doc(id).get();
    
    if (!userDoc.exists) return res.status(404).json({ error: "User not found" });

    const user = userDoc.data()!;
    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: "7d" });
    res.cookie("token", token, { 
      httpOnly: true, 
      secure: true, 
      sameSite: "none",
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });
    const { password: _, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
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

    const userRef = db.collection("users").doc();
    const userData = {
      id: userRef.id,
      username,
      password: hashedPassword,
      name: name || username,
      birthdate: birthdate || null,
      gender: gender || null,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    };

    await userRef.set(userData);
    
    const token = jwt.sign({ id: userData.id, username: userData.username }, JWT_SECRET, { expiresIn: "7d" });
    res.cookie("token", token, { 
      httpOnly: true, 
      secure: true, 
      sameSite: "none",
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });
    
    const { password: _, ...userWithoutPassword } = userData;
    return res.json(userWithoutPassword);
  } catch (err) {
    next(err);
  }
});

app.post("/api/users/delete", authenticate, async (req: any, res, next) => {
  try {
    const { id } = req.body;
    
    // Delete metrics
    const metricsSnapshot = await db.collection("metrics").where("userId", "==", id).get();
    const batch = db.batch();
    metricsSnapshot.docs.forEach(doc => batch.delete(doc.ref));
    
    // Delete goals
    const goalsSnapshot = await db.collection("goals").where("userId", "==", id).get();
    goalsSnapshot.docs.forEach(doc => batch.delete(doc.ref));
    
    // Delete user
    batch.delete(db.collection("users").doc(id));
    
    await batch.commit();
    
    if (req.user.id === id) {
      res.clearCookie("token", { httpOnly: true, secure: true, sameSite: "none" });
    }
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

app.post("/api/logout", (req, res) => {
  res.clearCookie("token", { httpOnly: true, secure: true, sameSite: "none" });
  res.json({ success: true });
});

app.get("/api/me", authenticate, async (req: any, res, next) => {
  try {
    const userDoc = await db.collection("users").doc(req.user.id).get();
    if (!userDoc.exists) return res.status(404).json({ error: "User not found" });
    
    const user = userDoc.data()!;
    const { password: _, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
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
    
    await db.collection("users").doc(req.user.id).update(updateData);
    
    const userDoc = await db.collection("users").doc(req.user.id).get();
    const user = userDoc.data()!;
    const { password: _, ...userWithoutPassword } = user;
    return res.json(userWithoutPassword);
  } catch (err) {
    next(err);
  }
});

app.post("/api/metrics", authenticate, async (req: any, res, next) => {
  try {
    const { gender, age, height, weight, waist, neck, hip, activityLevel, bmi, bmr, tdee, bodyFat } = req.body;
    const date = new Date().toISOString();

    await db.collection("metrics").add({ 
      userId: req.user.id, 
      date: admin.firestore.Timestamp.fromDate(new Date(date)), 
      gender, age, height, weight, waist, neck, hip, activityLevel, bmi, bmr, tdee, bodyFat 
    });
    return res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

app.get("/api/metrics", authenticate, async (req: any, res, next) => {
  try {
    const snapshot = await db.collection("metrics")
      .where("userId", "==", req.user.id)
      .orderBy("date", "desc")
      .get();
    
    const metrics = snapshot.docs.map(doc => {
      const data = doc.data();
      return { ...data, id: doc.id, date: data.date.toDate().toISOString() };
    });
    return res.json(metrics);
  } catch (err) {
    next(err);
  }
});

app.delete("/api/metrics/:id", authenticate, async (req: any, res, next) => {
  try {
    const { id } = req.params;
    const metricDoc = await db.collection("metrics").doc(id).get();
    
    if (!metricDoc.exists) return res.status(404).json({ error: "Metric not found" });
    if (metricDoc.data()!.userId !== req.user.id) return res.status(403).json({ error: "Forbidden" });
    
    await db.collection("metrics").doc(id).delete();
    return res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

app.get("/api/goals", authenticate, async (req: any, res, next) => {
  try {
    const snapshot = await db.collection("goals")
      .where("userId", "==", req.user.id)
      .limit(1)
      .get();
    
    if (snapshot.empty) return res.json(null);
    const data = snapshot.docs[0].data();
    return res.json({ ...data, id: snapshot.docs[0].id });
  } catch (err) {
    next(err);
  }
});

app.post("/api/goals", authenticate, async (req: any, res, next) => {
  try {
    const { targetWeight, targetBodyFat, dailyCalorieGoal, targetDate } = req.body;
    
    const snapshot = await db.collection("goals")
      .where("userId", "==", req.user.id)
      .limit(1)
      .get();
    
    if (!snapshot.empty) {
      await db.collection("goals").doc(snapshot.docs[0].id).update({ 
        targetWeight, targetBodyFat, dailyCalorieGoal, targetDate 
      });
    } else {
      await db.collection("goals").add({ 
        userId: req.user.id, targetWeight, targetBodyFat, dailyCalorieGoal, targetDate 
      });
    }
    return res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

app.get("/api/status", (req, res) => {
  res.json({ 
    status: "ok", 
    firebaseConfigured: true,
    environment: process.env.NODE_ENV || "development"
  });
});

// Global error handler
app.use((err: any, req: any, res: any, next: any) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal server error" });
});

async function setupMiddlewares() {
  if (process.env.VERCEL) {
    return;
  }

  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
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

if (!process.env.VERCEL) {
  setupMiddlewares().then(() => {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  });
}

export default app;



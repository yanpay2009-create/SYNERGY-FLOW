import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import helmet from "helmet";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Basic Authentication Middleware (Simulated for demo)
const authenticate = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  // In a real app, verify JWT or session here
  // For now, we'll check for a custom header to simulate auth
  const authHeader = req.headers["x-synergy-auth"];
  if (!authHeader && process.env.NODE_ENV === "production") {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
};

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  
  // Security Headers
  app.use(helmet({
    contentSecurityPolicy: false, // Disable CSP for Vite dev server compatibility
  }));

  const io = new Server(httpServer, {
    cors: {
      origin: process.env.APP_URL || "*", // Restrict origin in production
      methods: ["GET", "POST"]
    }
  });

  const PORT = 3000;

  app.use(express.json({ limit: "1mb" })); // Limit payload size

  // In-memory "database" for the demo
  let appState = {
    orders: [],
    commissions: [],
    feed: [],
    notifications: []
  };

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  app.get("/api/state", authenticate, (req, res) => {
    res.json(appState);
  });

  app.post("/api/orders", authenticate, (req, res) => {
    const order = req.body;
    
    // Basic Validation
    if (!order || !order.id || !order.total) {
      return res.status(400).json({ error: "Invalid order data" });
    }

    appState.orders.push(order);
    io.emit("order:created", order);
    res.status(201).json(order);
  });

  app.post("/api/notifications", authenticate, (req, res) => {
    const notification = req.body;

    // Basic Validation
    if (!notification || !notification.title || !notification.message) {
      return res.status(400).json({ error: "Invalid notification data" });
    }

    appState.notifications.push(notification);
    io.emit("notification:new", notification);
    res.status(201).json(notification);
  });

  // Error Handling Middleware
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error(err.stack);
    res.status(500).json({ error: "Internal Server Error" });
  });

  // Socket.io logic
  io.on("connection", (socket) => {
    console.log("Client connected:", socket.id);

    socket.on("admin:approve_post", (postId) => {
      console.log("Admin approved post:", postId);
      io.emit("post:approved", postId);
    });

    socket.on("admin:verify_payment", (orderId) => {
      console.log("Admin verified payment for order:", orderId);
      io.emit("order:verified", orderId);
    });

    socket.on("disconnect", () => {
      console.log("Client disconnected:", socket.id);
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

import type { Express, Request } from "express";
import { createServer, type Server } from "node:http";
import { WebSocketServer, WebSocket } from "ws";
import { z } from "zod";
import { whisprStore } from "./whispr-storage";
import {
  createConfessionSchema,
  createCrushSchema,
  createMarketItemSchema,
  toggleReactionSchema,
} from "./whispr-types";

function getAnonUserId(req: Request): string | null {
  // Optional header the client can pass in the future without account systems.
  // This keeps anonymity while enabling per-user safeguards.
  const h = req.header("x-whispr-id");
  if (h && h.trim().length > 0) return h.trim();
  return null;
}

function broadcast(wss: WebSocketServer, event: unknown) {
  const msg = JSON.stringify(event);
  wss.clients.forEach((ws: WebSocket) => {
    if (ws.readyState === ws.OPEN) ws.send(msg);
  });
}

export async function registerRoutes(app: Express): Promise<Server> {
  // put application routes here
  // prefix all routes with /api

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true, name: "Whispr API", version: "1" });
  });

  // Create HTTP server early so routes can broadcast via WS
  const httpServer = createServer(app);

  // ---- WebSocket (optional, for realtime campus "pulse") ----
  const wss = new WebSocketServer({ server: httpServer, path: "/ws" });
  wss.on("connection", (ws: WebSocket) => {
    ws.send(JSON.stringify({ type: "hello", t: Date.now() }));
  });

  // ---- Confessions ----
  app.get("/api/confessions", (req, res) => {
    const sort = req.query.sort === "trending" ? "trending" : "recent";
    const category = typeof req.query.category === "string" ? req.query.category : undefined;
    const limit = typeof req.query.limit === "string" ? parseInt(req.query.limit, 10) : undefined;
    const items = whisprStore.listConfessions({ sort, category, limit });
    res.json(items);
  });

  app.post("/api/confessions", (req, res) => {
    const parsed = createConfessionSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid confession", issues: parsed.error.issues });
    }
    const confession = whisprStore.createConfession(parsed.data);
    if (!confession) return res.status(400).json({ message: "Confession rejected" });
    broadcast(wss, { type: "confession:new", confession, t: Date.now() });
    res.status(201).json(confession);
  });

  app.delete("/api/confessions/:id", (req, res) => {
    const userId = getAnonUserId(req) || (typeof req.query.userId === "string" ? req.query.userId : "");
    if (!userId) return res.status(400).json({ message: "Missing userId" });
    const ok = whisprStore.deleteConfession(req.params.id, userId);
    if (!ok) return res.status(404).json({ message: "Not found" });
    res.status(204).send("");
  });

  app.post("/api/confessions/:id/reactions", (req, res) => {
    const parsed = toggleReactionSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid reaction", issues: parsed.error.issues });
    }
    const { confession, added } = whisprStore.toggleReaction({
      confessionId: req.params.id,
      userId: parsed.data.userId,
      reactionType: parsed.data.reactionType,
    });
    if (!confession) return res.status(404).json({ message: "Not found" });
    broadcast(wss, {
      type: "confession:reaction",
      confessionId: confession.id,
      reactionType: parsed.data.reactionType,
      added,
      t: Date.now(),
    });
    res.json({ confession, added });
  });

  // ---- Crushes ----
  app.get("/api/crushes", (req, res) => {
    const userId = getAnonUserId(req) || (typeof req.query.userId === "string" ? req.query.userId : "");
    if (!userId) return res.status(400).json({ message: "Missing userId" });
    res.json(whisprStore.listCrushes(userId));
  });

  app.post("/api/crushes", (req, res) => {
    const parsed = createCrushSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid crush", issues: parsed.error.issues });
    }
    const crush = whisprStore.createCrush(parsed.data);
    if (!crush) return res.status(400).json({ message: "Crush rejected" });
    broadcast(wss, { type: "crush:new", crush, t: Date.now() });
    res.status(201).json(crush);
  });

  app.delete("/api/crushes/:id", (req, res) => {
    const userId = getAnonUserId(req) || (typeof req.query.userId === "string" ? req.query.userId : "");
    if (!userId) return res.status(400).json({ message: "Missing userId" });
    const ok = whisprStore.deleteCrush(req.params.id, userId);
    if (!ok) return res.status(404).json({ message: "Not found" });
    res.status(204).send("");
  });

  app.post("/api/crushes/:id/reveal", (req, res) => {
    const userId = getAnonUserId(req) || (typeof req.query.userId === "string" ? req.query.userId : "");
    if (!userId) return res.status(400).json({ message: "Missing userId" });
    const updated = whisprStore.revealCrush(req.params.id, userId);
    if (!updated) return res.status(404).json({ message: "Not found" });
    res.json(updated);
  });

  // ---- Marketplace ----
  app.get("/api/market", (req, res) => {
    const category = typeof req.query.category === "string" ? req.query.category : undefined;
    const limit = typeof req.query.limit === "string" ? parseInt(req.query.limit, 10) : undefined;
    res.json(whisprStore.listMarketItems({ category, limit }));
  });

  app.post("/api/market", (req, res) => {
    const parsed = createMarketItemSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid market item", issues: parsed.error.issues });
    }
    const item = whisprStore.createMarketItem(parsed.data);
    if (!item) return res.status(400).json({ message: "Item rejected" });
    broadcast(wss, { type: "market:new", item, t: Date.now() });
    res.status(201).json(item);
  });

  app.delete("/api/market/:id", (req, res) => {
    const userId = getAnonUserId(req) || (typeof req.query.userId === "string" ? req.query.userId : "");
    if (!userId) return res.status(400).json({ message: "Missing userId" });
    const ok = whisprStore.deleteMarketItem(req.params.id, userId);
    if (!ok) return res.status(404).json({ message: "Not found" });
    res.status(204).send("");
  });

  app.post("/api/market/:id/toggle-sold", (req, res) => {
    const bodySchema = z.object({ sellerId: z.string().min(1) });
    const parsed = bodySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid request", issues: parsed.error.issues });
    }
    const updated = whisprStore.toggleSold(req.params.id, parsed.data.sellerId);
    if (!updated) return res.status(404).json({ message: "Not found" });
    res.json(updated);
  });

  // Broadcast on create routes (without changing existing request handlers)
  // Minimal, safe, and doesn't affect the current local-first app.
  app.post("/api/events/broadcast", (req, res) => {
    // reserved hook for future client integration
    broadcast(wss, { type: "event", data: req.body ?? null, t: Date.now() });
    res.json({ ok: true });
  });

  return httpServer;
}

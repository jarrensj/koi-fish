import type { Request, Response } from "express";
import os from "os";

const startedAt = Date.now();

export const getTgHealth = (_req: Request, res: Response) => {
  const ok = true; // if you add checks later, flip this accordingly
  const status = ok ? "🟢 healthy" : "🔴 degraded";

  const mem = process.memoryUsage();
  res.json({
    ok,
    status,                         
    scope: "telegram-test",
    service: "koi-fish (tg-health)",
    timestamp: new Date().toISOString(),
    uptimeSec: Math.round(process.uptime()),
    host: os.hostname(),
    node: process.version,
    memory: {
      rss: mem.rss,
      heapUsed: mem.heapUsed,
      heapTotal: mem.heapTotal,
      external: mem.external,
    },
    startedAt: new Date(startedAt).toISOString(),
  });
};

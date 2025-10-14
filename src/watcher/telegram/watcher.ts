/**
 * Telegram Watcher (production)
 * - Joins the configured chat and logs EVERY message (and caption) to console.
 * - Filters to TG_TARGET_ID (numeric id like -100..., or @username if public).
 * - Requires bot privacy disabled in groups for full message visibility.
 */

import { Telegraf } from "telegraf";

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const TOKEN = process.env.TG_BOT_TOKEN || "";
const TARGET = (process.env.TG_TARGET_ID || "").trim();

if (!TOKEN) throw new Error("TG_BOT_TOKEN is required");

const bot = new Telegraf(TOKEN);

/** normalize target matching against either numeric id or username */
function isTargetChat(chat: { id: number; username?: string | null; title?: string | null }) {
  if (!TARGET) return true; // log everything if no target set
  if (/^-?\d+$/.test(TARGET)) return String(chat.id) === TARGET;
  if (chat?.username) return `@${chat.username}`.toLowerCase() === TARGET.toLowerCase();
  if (chat?.title) return chat.title.toLowerCase() === TARGET.toLowerCase();
  return false;
}

bot.on(["message", "channel_post"], (ctx) => {
  // message in groups/DMs, channel_post in channels
  const msg = (ctx.update as any).message || (ctx.update as any).channel_post;
  if (!msg || !msg.chat) return;

  if (!isTargetChat(msg.chat)) return;

  const when = new Date((msg.date || Math.floor(Date.now() / 1000)) * 1000).toISOString();
  const author =
    msg.from?.username
      ? `@${msg.from.username}`
      : msg.from?.first_name
      ? `${msg.from.first_name}${msg.from.last_name ? " " + msg.from.last_name : ""}`
      : msg.sender_chat?.title || "unknown";
  const text = msg.text ?? msg.caption ?? "<non-text message>";

  console.log(`[TG] ${when} | chat=${msg.chat.title || msg.chat.username || msg.chat.id} | from=${author} | ${text}`);
});

bot.launch().then(() => {
  console.log("[TG] watcher running. Add the bot to the chat and send a message.");
});

// stop
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));

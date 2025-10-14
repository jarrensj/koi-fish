/**
 * Telegram Watcher (diagnostic)
 * - Prints chat metadata (id, type, username, title) for any message it sees.
 * - Use to discover the correct chat id (TG_TARGET_ID) or debug permissions.
 * - Not intended for continuous running.
 */

import { Telegraf } from "telegraf";

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const TOKEN = process.env.TG_BOT_TOKEN || "";
if (!TOKEN) throw new Error("TG_BOT_TOKEN is required");

const bot = new Telegraf(TOKEN);

bot.on(["message", "channel_post"], (ctx) => {
  const update: any = ctx.update;
  const msg = update.message || update.channel_post;
  if (!msg) return;

  const chat = msg.chat;
  console.log("----- CHAT INFO -----");
  console.log("chat.id:", chat.id);
  console.log("chat.type:", chat.type);        // private | group | supergroup | channel
  console.log("chat.username:", chat.username); // may be undefined
  console.log("chat.title:", chat.title);       // groups/channels
  console.log("----------------------");
  const text = msg.text ?? msg.caption ?? "<non-text>";
  console.log("message:", text);
});

bot.launch().then(() => console.log("diag watcher running"));
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));

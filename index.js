import express from "express";
import fetch from "node-fetch";

const app = express();
app.use(express.json());

// ---------- CONFIG ----------
const PORT = process.env.PORT || 3000;
const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;

if (!DISCORD_WEBHOOK_URL) {
  console.error("❌ Missing DISCORD_WEBHOOK_URL");
  process.exit(1);
}

// ---------- STATE ----------
const players = new Set();
const rooms = new Set();
let lastCCU = -1;

// ---------- ROLE PINGS ----------
function getRolePing(ccu) {
  if (ccu >= 16) return "<@&16playersFULLROOM>";
  if (ccu >= 10) return "<@&10players>";
  if (ccu >= 8) return "<@&8players>";
  if (ccu >= 5) return "<@&5players>";
  return "";
}

// ---------- DISCORD ----------
async function sendDiscordUpdate() {
  const ccu = players.size;
  const roomCount = rooms.size;

  if (ccu === lastCCU) return;
  lastCCU = ccu;

  await fetch(DISCORD_WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      content: getRolePing(ccu),
      embeds: [{
        title: "🎮 Server Activity",
        description:
          `👥 Players Online: **${ccu}**\n` +
          `🧩 Active Rooms: **${roomCount}**`,
        color: ccu >= 16 ? 0xff0000 : 0x00ff99,
        timestamp: new Date().toISOString()
      }]
    })
  });

  console.log(`📢 Discord updated: ${ccu} players`);
}

// ---------- PHOTON WEBHOOK ----------
app.post("/photon/webhook", async (req, res) => {
  const { Type, Body } = req.body;

  if (!Type || !Body) {
    return res.sendStatus(400);
  }

  const userId = Body.UserId;
  const roomId = Body.GameId;

  console.log(`📡 Photon: ${Type}`, userId, roomId);

  switch (Type) {
    case "Join":
      if (userId) players.add(userId);
      if (roomId) rooms.add(roomId);
      break;

    case "Leave":
      if (userId) players.delete(userId);
      break;

    case "CreateGame":
      if (roomId) rooms.add(roomId);
      break;

    case "CloseGame":
      if (roomId) rooms.delete(roomId);
      break;
  }

  await sendDiscordUpdate();
  res.sendStatus(200);
});

// ---------- HEALTH ----------
app.get("/", (_, res) => {
  res.send("✅ Photon Webhook Bot Running");
});

// ---------- START ----------
app.listen(PORT, () => {
  console.log(`🚀 Listening on port ${PORT}`);
});

import express from "express";
import fetch from "node-fetch";

const app = express();
app.use(express.json());

// ---------- CONFIG ----------
const PORT = process.env.PORT || 3000;
const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;

// ---------- VALIDATE ----------
if (!DISCORD_WEBHOOK_URL) {
  console.error("❌ Missing DISCORD_WEBHOOK_URL");
  process.exit(1);
}

// ---------- STATE ----------
let currentPlayers = new Set();
let currentRooms = new Set();
let lastCCU = 0;

// ---------- ROLE MENTIONS ----------
function getRolePing(ccu) {
  if (ccu >= 16) return "@16playersFULLROOM";
  if (ccu >= 10) return "@10players";
  if (ccu >= 8) return "@8players";
  if (ccu >= 5) return "@5players";
  return null;
}

// ---------- DISCORD WEBHOOK ----------
async function sendDiscordUpdate() {
  const ccu = currentPlayers.size;
  const rooms = currentRooms.size;

  if (ccu === lastCCU) return;
  lastCCU = ccu;

  const rolePing = getRolePing(ccu);

  await fetch(DISCORD_WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      content: rolePing || "",
      embeds: [{
        title: "🎮 Server Activity Update",
        description:
          `👥 Players Online: **${ccu}**\n` +
          `🧩 Active Rooms: **${rooms}**`,
        color: ccu >= 16 ? 0xff0000 : 0x00ff99,
        timestamp: new Date().toISOString()
      }]
    })
  });

  console.log(`✅ CCU updated → ${ccu} players, ${rooms} rooms`);
}

// ---------- PHOTON WEBHOOK ----------
app.post("/photon/webhook", async (req, res) => {
  const { Event, UserId, RoomId } = req.body;

  console.log("📡 Photon event:", Event, UserId, RoomId);

  switch (Event) {
    case "Join":
      if (UserId) currentPlayers.add(UserId);
      if (RoomId) currentRooms.add(RoomId);
      break;

    case "Leave":
      if (UserId) currentPlayers.delete(UserId);
      break;

    case "CreateGame":
      if (RoomId) currentRooms.add(RoomId);
      break;

    case "CloseGame":
      if (RoomId) currentRooms.delete(RoomId);
      break;
  }

  await sendDiscordUpdate();
  res.sendStatus(200);
});

// ---------- HEALTH CHECK ----------
app.get("/", (req, res) => {
  res.send("✅ Photon Webhook Bot Running");
});

// ---------- START ----------
app.listen(PORT, () => {
  console.log(`🚀 Server listening on port ${PORT}`);
});

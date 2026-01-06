import express from "express";
import fetch from "node-fetch";

const app = express();
app.use(express.json());

// ---------- CONFIG ----------
const PORT = process.env.PORT || 3000;
const STATS_URL = process.env.STATS_URL; // URL to fetch players
const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;

if (!STATS_URL || !DISCORD_WEBHOOK_URL) {
  console.error("❌ Missing STATS_URL or DISCORD_WEBHOOK_URL");
  process.exit(1);
}

// ---------- STATE ----------
let lastPlayerCount = -1;
const pingedThresholds = new Set();

// Role thresholds
const thresholds = [5, 8, 10, 16];
const roleMentions = {
  5: "<@&1457813101641596938>",
  8: "<@&1457813047803379784>",
  10: "<@&1457811053583798337>",
  16: "<@&1457813136500457636>"
};

// ---------- HELPERS ----------
function getPingForCount(count) {
  for (let t of thresholds.slice().reverse()) { // check highest threshold first
    if (count >= t) return t;
  }
  return null;
}

async function sendDiscordMessage(content, playerCount, roomCount) {
  try {
    await fetch(DISCORD_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: content,
        embeds: [{
          title: "🎮 Server Activity",
          description: `👥 Players Online: **${playerCount}**\n🧩 Active Rooms: **${roomCount}**`,
          color: playerCount >= 16 ? 0xff0000 : 0x00ff99,
          timestamp: new Date().toISOString()
        }],
        allowed_mentions: {
          parse: ["roles"] // ensure roles actually ping
        }
      })
    });
    console.log(`📢 Discord updated: ${playerCount} players, ${roomCount} rooms`);
  } catch (err) {
    console.error("❌ Error sending Discord message:", err.message);
  }
}

// ---------- MAIN CHECK ----------
async function checkPlayerCount() {
  try {
    const res = await fetch(STATS_URL);
    const data = await res.json();

    const playerCount = data.players;
    const roomCount = data.rooms;

    if (playerCount !== lastPlayerCount) {
      lastPlayerCount = playerCount;

      // Check if a threshold ping should happen
      const threshold = getPingForCount(playerCount);

      let pingContent = "";
      if (threshold && !pingedThresholds.has(threshold)) {
        pingContent = roleMentions[threshold];
        pingedThresholds.add(threshold);
      }

      // Reset thresholds that are no longer met
      thresholds.forEach(t => {
        if (playerCount < t) pingedThresholds.delete(t);
      });

      await sendDiscordMessage(pingContent, playerCount, roomCount);
    }
  } catch (err) {
    console.error("❌ Error fetching player count:", err.message);
  }
}

// ---------- EXPRESS HEALTH ----------
app.get("/", (_, res) => {
  res.send("✅ Player Count Bot Running");
});

// ---------- START ----------
app.listen(PORT, () => {
  console.log(`🚀 Listening on port ${PORT}`);
});

// ---------- RUN INTERVAL ----------
setInterval(checkPlayerCount, 15 * 1000); // check every 15 seconds
checkPlayerCount(); // run immediately

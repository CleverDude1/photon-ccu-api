import fetch from "node-fetch";

// ---------- CONFIG ----------
const API_URL = process.env.API_URL; // your API that returns { players, rooms }
const WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;
const CHECK_INTERVAL = 60 * 1000; // check every 60 seconds

// ---------- VALIDATE ENV ----------
if (!API_URL || !WEBHOOK_URL) {
  console.error("❌ Missing API_URL or DISCORD_WEBHOOK_URL environment variable!");
  process.exit(1);
}

// ---------- STATE ----------
let lastPlayers = null; // to track changes
let lastRooms = null;

// ---------- ROLE MENTIONS ----------
function getPing(players) {
  if (players === 5) return "<@&ROLE_ID_5>";   // replace ROLE_ID_5 with your Discord role ID
  if (players === 8) return "<@&ROLE_ID_8>";   // replace ROLE_ID_8
  if (players === 10) return "<@&ROLE_ID_10>"; // replace ROLE_ID_10
  if (players === 16) return "<@&ROLE_ID_16>"; // replace ROLE_ID_16
  return null;
}

// ---------- FETCH API ----------
async function fetchGameStats() {
  try {
    const res = await fetch(API_URL);
    const data = await res.json();

    const players = data?.players ?? null;
    const rooms = data?.rooms ?? null;

    if (players === null || rooms === null) throw new Error("API missing players or rooms");

    return { players, rooms };
  } catch (err) {
    console.error("❌ Error fetching API:", err.message);
    return null;
  }
}

// ---------- SEND DISCORD WEBHOOK ----------
async function sendWebhook(players, rooms, ping) {
  try {
    await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: ping ?? "", // ping role if available
        embeds: [{
          title: "🎮 Game Stats Update",
          description: `Players online: **${players}**\nRooms active: **${rooms}**`,
          color: 0x00ff99,
          timestamp: new Date().toISOString()
        }]
      })
    });
    console.log(`✅ Sent update: ${players} players, ${rooms} rooms`);
  } catch (err) {
    console.error("❌ Error sending webhook:", err.message);
  }
}

// ---------- CHECK AND NOTIFY ----------
async function checkStats() {
  const stats = await fetchGameStats();
  if (!stats) return;

  const { players, rooms } = stats;
  const ping = getPing(players);

  // Send webhook only if players or rooms changed
  if (players !== lastPlayers || rooms !== lastRooms) {
    lastPlayers = players;
    lastRooms = rooms;
    await sendWebhook(players, rooms, ping);
  }
}

// ---------- RUN INTERVAL ----------
setInterval(checkStats, CHECK_INTERVAL);

// ---------- RUN ON STARTUP ----------
checkStats();

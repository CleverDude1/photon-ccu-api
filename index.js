import fetch from "node-fetch";

// ---------- CONFIG ----------
const PHOTON_API_KEY = process.env.PHOTON_API_KEY; // your Photon API key
const WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;
const GAME_ID = process.env.PHOTON_GAME_ID; // your Photon game ID
const CHECK_INTERVAL = 60 * 1000; // check every 60 seconds

// ---------- VALIDATE ENV ----------
if (!PHOTON_API_KEY || !WEBHOOK_URL || !GAME_ID) {
  console.error("❌ Missing PHOTON_API_KEY, DISCORD_WEBHOOK_URL, or PHOTON_GAME_ID!");
  process.exit(1);
}

// ---------- STATE ----------
let lastCCU = null; // last known player count
let lastRooms = null; // optional if you track rooms

// ---------- ROLE MENTIONS ----------
function getPing(players) {
  if (players === 5) return "<@5players>";   // replace ROLE_ID_5 with your Discord role ID
  if (players === 8) return "<@8players>";   // replace ROLE_ID_8
  if (players === 10) return "<@10players>"; // replace ROLE_ID_10
  if (players === 16) return "<@16playersFULLROOM>"; // replace ROLE_ID_16 (FULL ROOM)
  return null;
}

// ---------- FETCH CCU FROM PHOTON ----------
async function fetchCCU() {
  try {
    const res = await fetch(`https://api.photonengine.com/${GAME_ID}/ccu?apikey=${PHOTON_API_KEY}`);
    const data = await res.json();

    // Adjust according to Photon API response
    const ccu = data?.ccu ?? null; // total online players
    const rooms = data?.rooms ?? null; // if your API provides rooms

    if (ccu === null) throw new Error("CCU not found in response");

    return { players: ccu, rooms };
  } catch (err) {
    console.error("❌ Error fetching CCU:", err.message);
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
          title: "🎮 Current Game Stats",
          description: `Players online: **${players}**${rooms !== null ? `\nRooms active: **${rooms}**` : ""}`,
          color: 0x00ff99,
          timestamp: new Date().toISOString()
        }]
      })
    });
    console.log(`✅ Sent update: ${players} players${rooms !== null ? `, ${rooms} rooms` : ""}`);
  } catch (err) {
    console.error("❌ Error sending webhook:", err.message);
  }
}

// ---------- CHECK AND NOTIFY ----------
async function checkStats() {
  const stats = await fetchCCU();
  if (!stats) return;

  const { players, rooms } = stats;
  const ping = getPing(players);

  // Send webhook only if players or rooms changed
  if (players !== lastCCU || rooms !== lastRooms) {
    lastCCU = players;
    lastRooms = rooms;
    await sendWebhook(players, rooms, ping);
  }
}

// ---------- RUN INTERVAL ----------
setInterval(checkStats, CHECK_INTERVAL);

// ---------- RUN ON STARTUP ----------
checkStats();

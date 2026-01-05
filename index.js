import fetch from "node-fetch";

// ---------- CONFIG ----------
const PHOTON_API_KEY = process.env.PHOTON_API_KEY;
const WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;
const CHECK_INTERVAL = 60 * 1000; // check every 60 seconds

// ---------- VALIDATE ENV ----------
if (!PHOTON_API_KEY || !WEBHOOK_URL) {
  console.error("❌ Missing PHOTON_API_KEY or DISCORD_WEBHOOK_URL environment variable!");
  process.exit(1);
}

// ---------- STATE ----------
let lastCCU = null; // last known CCU

// ---------- FETCH CURRENT CCU ----------
async function fetchCCU() {
  try {
    const res = await fetch(`https://api.photonengine.com/your_game_id/ccu?apikey=${PHOTON_API_KEY}`);
    const data = await res.json();

    // Adjust this according to Photon API response format
    const ccu = data?.ccu ?? null;
    if (ccu === null) throw new Error("CCU not found in response");

    return ccu;
  } catch (err) {
    console.error("❌ Error fetching CCU:", err.message);
    return null;
  }
}

// ---------- SEND DISCORD WEBHOOK ----------
async function sendWebhook(ccu) {
  try {
    await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        embeds: [{
          title: "📊 Current CCU Update",
          description: `Current online players: **${ccu}**`,
          color: 0x00ff99,
          timestamp: new Date().toISOString()
        }]
      })
    });
    console.log(`✅ Sent CCU update: ${ccu}`);
  } catch (err) {
    console.error("❌ Error sending webhook:", err.message);
  }
}

// ---------- CHECK AND NOTIFY ----------
async function checkCCU() {
  const ccu = await fetchCCU();
  if (ccu === null) return;

  // Send webhook only if CCU changed
  if (ccu !== lastCCU) {
    lastCCU = ccu;
    await sendWebhook(ccu);
  }
}

// ---------- RUN INTERVAL ----------
setInterval(checkCCU, CHECK_INTERVAL);

// ---------- RUN ON STARTUP ----------
checkCCU();

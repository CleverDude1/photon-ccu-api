import fetch from "node-fetch";

const CHAT_URL = "https://kiskofa2006.serv00.net/games/TRP/lobby_chat.txt";
const DISCORD_WEBHOOK = process.env.DISCORD_WEBHOOK_URL;
const POLL_INTERVAL = 30 * 1000; // check every 30 seconds

if (!DISCORD_WEBHOOK) {
  console.error("❌ Missing DISCORD_WEBHOOK_URL!");
  process.exit(1);
}

let seenIds = new Set();

// Convert Unix timestamp (seconds) to readable format
function formatTimestamp(unix) {
  const date = new Date(parseInt(unix, 10) * 1000);

  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZone: "UTC"
  }) + " UTC";
}

async function fetchChat() {
  try {
    const res = await fetch(CHAT_URL);
    const text = await res.text();

    const lines = text.trim().split("\n");

    return lines
      .map(line => {
        const parts = line.split("|");

        // Ensure correct format
        if (parts.length < 4) return null;

        return {
          id: parts[0].trim(),
          time: parts[1].trim(),
          name: parts[2].trim(),
          message: parts.slice(3).join("|").trim(), // in case message contains |
        };
      })
      .filter(Boolean);

  } catch (err) {
    console.error("❌ Error fetching chat:", err.message);
    return [];
  }
}

async function sendWebhook(msg) {
  try {
    const readableTime = formatTimestamp(msg.time);

    await fetch(DISCORD_WEBHOOK, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: `🆔 **#${msg.id}** | **${msg.name}**: ${msg.message}\n🕒 ${readableTime}`
      })
    });

    console.log(`✅ Sent: ${msg.id} - ${msg.name}`);
  } catch (err) {
    console.error("❌ Discord send error:", err.message);
  }
}

async function poll() {
  const chat = await fetchChat();

  for (const msg of chat) {
    if (!seenIds.has(msg.id)) {
      await sendWebhook(msg);
      seenIds.add(msg.id);
    }
  }
}

setInterval(poll, POLL_INTERVAL);
poll();

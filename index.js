import fetch from "node-fetch";

const CHAT_URL = "https://kiskofa2006.serv00.net/games/TRP/lobby_chat.txt";
const DISCORD_WEBHOOK = process.env.DISCORD_WEBHOOK_URL;
const POLL_INTERVAL = 30 * 1000; // check every 30 seconds

if (!DISCORD_WEBHOOK) {
  console.error("❌ Missing DISCORD_WEBHOOK_URL!");
  process.exit(1);
}

let seenIds = new Set();

function formatTimestamp(unix) {
  const date = new Date(Number(unix) * 1000);
  return date.toISOString().replace("T", " ").replace(".000Z", " UTC");
}

async function fetchChat() {
  try {
    const res = await fetch(CHAT_URL);
    const text = await res.text();

    const lines = text.trim().split("\n");
    return lines.map(line => {
      const parts = line.split("|");
      return {
        id: parts[0],
        time: parts[1],
        formattedTime: formatTimestamp(parts[1]),
        name: parts[2],
        message: parts[3]
      };
    });
  } catch (err) {
    console.error("❌ Error fetching chat:", err.message);
    return [];
  }
}

async function sendWebhook(msg) {
  try {
    await fetch(DISCORD_WEBHOOK, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: `**${msg.name}**: ${msg.message} \`(${msg.formattedTime})\``
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

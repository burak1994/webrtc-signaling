const express = require("express");
const http = require("http");
const WebSocket = require("ws");

const app = express();

app.get("/", (req, res) => {
  res.send("WebRTC Signaling Server çalışıyor.");
});

const server = http.createServer(app);

const wss = new WebSocket.Server({ server });

const rooms = new Map();

wss.on("connection", (ws) => {
  let roomId = null;

  ws.on("message", (message) => {
    let data;

    try {
      data = JSON.parse(message);
    } catch {
      return;
    }

    if (data.type === "join") {
      roomId = data.room;

      if (!rooms.has(roomId)) {
        rooms.set(roomId, new Set());
      }

      const room = rooms.get(roomId);

      if (room.size >= 2) {
        ws.send(JSON.stringify({
          type: "error",
          message: "Oda dolu."
        }));
        return;
      }

      room.add(ws);

      ws.send(JSON.stringify({
        type: "joined"
      }));

      if (room.size === 2) {
        for (const client of room) {
          client.send(JSON.stringify({
            type: "ready"
          }));
        }
      }

      return;
    }

    if (!roomId) return;

    const room = rooms.get(roomId);

    if (!room) return;

    for (const client of room) {
      if (client !== ws && client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(data));
      }
    }
  });

  ws.on("close", () => {
    if (!roomId) return;

    const room = rooms.get(roomId);

    if (!room) return;

    room.delete(ws);

    if (room.size === 0) {
      rooms.delete(roomId);
    }
  });
});

const PORT = process.env.PORT || 10000;

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Server ${PORT} portunda çalışıyor`);
});

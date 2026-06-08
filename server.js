const http = require("http");
const { WebSocketServer } = require("ws");

const httpServer = http.createServer((req, res) => {
  res.writeHead(200);
  res.end("SyncStream signaling server is running");
});

const wss = new WebSocketServer({ server: httpServer });
const rooms = {};

function broadcast(roomId, senderId, data) {
  const room = rooms[roomId];
  if (!room) return;
  const message = JSON.stringify(data);
  room.forEach((client) => {
    if (client.id !== senderId && client.ws.readyState === 1) {
      client.ws.send(message);
    }
  });
}

wss.on("connection", (ws) => {
  ws.id = Math.random().toString(36).slice(2);
  ws.roomId = null;
  console.log("Connected:", ws.id);

  ws.on("message", (raw) => {
    try {
      const msg = JSON.parse(raw);
      const { type, room } = msg;

      if (type === "room:join") {
        ws.roomId = room;
        if (!rooms[room]) rooms[room] = [];
        rooms[room].push({ id: ws.id, ws });
        broadcast(room, ws.id, { type: "peer:joined", id: ws.id, role: msg.role });
        ws.send(JSON.stringify({ type: "room:state", state: { hostPosition: 0, playState: "paused" } }));
        console.log(`${msg.role} joined room ${room}`);
      } else {
        broadcast(room, ws.id, msg);
      }
    } catch (e) {
      console.error("Parse error:", e);
    }
  });

  ws.on("close", () => {
    const room = ws.roomId;
    if (room && rooms[room]) {
      rooms[room] = rooms[room].filter((c) => c.id !== ws.id);
      broadcast(room, ws.id, { type: "host:disconnect", id: ws.id });
      if (rooms[room].length === 0) delete rooms[room];
    }
    console.log("Disconnected:", ws.id);
  });
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, "0.0.0.0", () => {
  console.log(`SyncStream signaling server running on port ${PORT}`);
});

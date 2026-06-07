const http = require("http");
const { Server } = require("socket.io");

const httpServer = http.createServer((req, res) => {
  res.writeHead(200);
  res.end("SyncStream signaling server is running");
});

const io = new Server(httpServer, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

const rooms = {};

io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);

  socket.on("room:join", ({ room, role }) => {
    socket.join(room);
    socket.data.room = room;
    if (!rooms[room]) rooms[room] = { hostPosition: 0, state: "paused" };
    socket.to(room).emit("peer:joined", { id: socket.id, role });
    socket.emit("room:state", rooms[room]);
    console.log(`${role} joined room ${room}`);
  });

  socket.on("sync:state", (data) => {
    if (rooms[data.room]) rooms[data.room] = { ...rooms[data.room], ...data };
    socket.to(data.room).emit("sync:state", data);
  });

  socket.on("sync:seek", (data) => socket.to(data.room).emit("sync:seek", data));
  socket.on("sync:buffered", (data) => socket.to(data.room).emit("sync:buffered", data));
  socket.on("chat:message", (data) => socket.to(data.room).emit("chat:message", data));
  socket.on("webrtc:offer", (data) => socket.to(data.room).emit("webrtc:offer", data));
  socket.on("webrtc:answer", (data) => socket.to(data.room).emit("webrtc:answer", data));
  socket.on("webrtc:ice", (data) => socket.to(data.room).emit("webrtc:ice", data));
  socket.on("media:change", (data) => socket.to(data.room).emit("media:change", data));

  socket.on("disconnect", () => {
    const room = socket.data.room;
    if (room) socket.to(room).emit("host:disconnect", { id: socket.id });
    console.log("Client disconnected:", socket.id);
  });
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, "0.0.0.0", () => {
  console.log(`SyncStream signaling server running on port ${PORT}`);
});

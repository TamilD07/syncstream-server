const { Server } = require("socket.io");
const httpServer = require("http").createServer();
const io = new Server(httpServer, { cors: { origin: "*" } });

const rooms = {};

io.on("connection", (socket) => {
  socket.on("room:join", ({ room, role }) => {
    socket.join(room);
    if (!rooms[room]) rooms[room] = { hostPosition: 0, state: "paused" };
    socket.to(room).emit("peer:joined", { id: socket.id, role });
    socket.emit("room:state", rooms[room]);
  });
  socket.on("sync:state", (data) => {
    rooms[data.room] = { ...rooms[data.room], ...data };
    socket.to(data.room).emit("sync:state", data);
  });
  socket.on("sync:seek", (data) => socket.to(data.room).emit("sync:seek", data));
  socket.on("chat:message", (data) => socket.to(data.room).emit("chat:message", data));
  socket.on("webrtc:offer", (data) => socket.to(data.room).emit("webrtc:offer", data));
  socket.on("webrtc:answer", (data) => socket.to(data.room).emit("webrtc:answer", data));
  socket.on("webrtc:ice", (data) => socket.to(data.room).emit("webrtc:ice", data));
  socket.on("media:change", (data) => socket.to(data.room).emit("media:change", data));
  socket.on("disconnect", () => {
    Object.keys(rooms).forEach(room => {
      socket.to(room).emit("host:disconnect", { id: socket.id });
    });
  });
});

httpServer.listen(process.env.PORT || 3000);

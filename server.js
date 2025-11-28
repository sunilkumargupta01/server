const express = require("express");
const http = require("http");
const WebSocket = require("ws");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// rooms = { roomId: Set<WebSocket> }
const rooms = {};

wss.on("connection", (ws) => {
  console.log("Client connected");

  ws.on("message", (data) => {
    let msg;
    try {
      msg = JSON.parse(data.toString());
    } catch (e) {
      return;
    }

    // user joining a room
    if (msg.type === "join") {
      const { room } = msg;
      ws.room = room;

      if (!rooms[room]) rooms[room] = new Set();
      rooms[room].add(ws);

      console.log(`Client joined room: ${room}`);
      return;
    }

    // signal forwarding
    if (msg.type === "signal" && ws.room) {
      const room = rooms[ws.room];
      if (!room) return;

      // send to all other members in the room
      room.forEach((client) => {
        if (client !== ws && client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify(msg));
        }
      });
    }
  });

  ws.on("close", () => {
    if (ws.room && rooms[ws.room]) {
      rooms[ws.room].delete(ws);
      if (rooms[ws.room].size === 0) {
        delete rooms[ws.room];
      }
    }
    console.log("Client disconnected");
  });
});

server.listen(process.env.PORT || 8080, () => {
  console.log("Server running on port", process.env.PORT || 8080);
});

const WebSocket = require("ws");
const port = process.env.PORT || 8080;
const wss = new WebSocket.Server({ port });

// Rooms map: roomId -> Set of sockets
const rooms = new Map();

wss.on("connection", (ws) => {
  ws.on("message", (msg) => {
    try {
      const data = JSON.parse(msg);
      const { type, room, payload } = data;
      if (!room) return;
      if (!rooms.has(room)) rooms.set(room, new Set());

      const clients = rooms.get(room);

      if (type === "join") {
        ws.room = room;
        clients.add(ws);
        // reply with current client count
        ws.send(
          JSON.stringify({ type: "joined", payload: { count: clients.size } })
        );
      } else if (type === "signal") {
        // relay signaling payload to all other clients in the same room
        for (const client of clients) {
          if (client !== ws && client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ type: "signal", payload }));
          }
        }
      }
    } catch (e) {
      console.error("Bad message", e);
    }
  });

  ws.on("close", () => {
    const room = ws.room;
    if (!room) return;
    const clients = rooms.get(room);
    if (!clients) return;
    clients.delete(ws);
    if (clients.size === 0) rooms.delete(room);
  });
});

console.log(`Signaling server running on ws://0.0.0.0:${port}`);

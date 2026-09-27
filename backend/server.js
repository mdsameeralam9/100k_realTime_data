const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Generate 10,000 initial stock records
const stocks = new Map();
const TOTAL_STOCKS = 10000;

for (let i = 1; i <= TOTAL_STOCKS; i++) {
  stocks.set(i, {
    id: i,
    name: `Company ${i}`,
    symbol: `SYM${i}`,
    price: +(Math.random() * 1000).toFixed(2),
    quantity: Math.floor(Math.random() * 10000),
    status: Math.random() > 0.5 ? 'ACTIVE' : 'INACTIVE',
    updatedAt: Date.now()
  });
}

// REST API to return the initial 10,000 records
app.get('/api/stocks', (req, res) => {
  // Convert Map values to an array
  res.json(Array.from(stocks.values()));
});

// WebSocket connection handling
wss.on('connection', (ws) => {
  console.log('New client connected');

  // Send initial connection message
  ws.send(JSON.stringify({
    type: "CONNECTED",
    message: "WebSocket connection established"
  }));

  ws.on('close', () => {
    console.log('Client disconnected');
  });
});

// Simulate real-time high-frequency data stream
setInterval(() => {
  // Pick a random number of stocks to update (e.g., 50 at a time)
  const numUpdates = 50;
  
  for (let i = 0; i < numUpdates; i++) {
    const randomId = Math.floor(Math.random() * TOTAL_STOCKS) + 1;
    const stock = stocks.get(randomId);
    
    if (stock) {
      // Create delta update (only changed fields)
      const updateData = {
        id: stock.id,
        price: +(stock.price + (Math.random() * 10 - 5)).toFixed(2), // fluctuate by -5 to +5
        quantity: stock.quantity + Math.floor(Math.random() * 20 - 10), // fluctuate quantity
        updatedAt: Date.now()
      };

      // Ensure price doesn't go below 0
      if (updateData.price < 0.01) updateData.price = 0.01;
      if (updateData.quantity < 0) updateData.quantity = 0;

      // Update in-memory Map
      stocks.set(randomId, { ...stock, ...updateData });

      // Broadcast update to all connected clients
      const message = JSON.stringify({
        type: "STOCK_UPDATE",
        data: updateData
      });

      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(message);
        }
      });
    }
  }
}, 100); // 100ms interval for high-frequency updates

const PORT = 5000;
server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  console.log(`WebSocket server is running on ws://localhost:${PORT}`);
});

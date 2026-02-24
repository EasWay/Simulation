import express from "express";
import { createServer as createViteServer } from "vite";
import { createServer } from "http";
import { Server } from "socket.io";
import { v4 as uuidv4 } from "uuid";

async function startServer() {
  const app = express();
  const PORT = 3000;
  const httpServer = createServer(app);
  const io = new Server(httpServer, { cors: { origin: "*" } });

  app.use(express.json());

  // API routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Simulation state
  let isOffline = false;
  let latency = 0; // ms

  // VSDC Clearance Endpoint
  app.post("/api/vsdc/clearance", async (req, res) => {
    const { uuid, company_tin, items, total } = req.body;
    
    // Simulate latency
    if (latency > 0) {
      await new Promise((resolve) => setTimeout(resolve, latency));
    }

    if (isOffline) {
      return res.status(503).json({ error: "GRA API is currently unreachable." });
    }

    // Tax Computation (Act 1151)
    const base = total / 1.20; // Reverse calculate base from total assuming 20% flat rate
    const vat = base * 0.15;
    const nhil = base * 0.025;
    const getfund = base * 0.025;

    const response = {
      distributor_tin: company_tin,
      num: `INV-${Date.now()}`,
      ysdcid: `SDC-${uuidv4().substring(0, 8)}`,
      ysdcrecnum: Math.floor(Math.random() * 10000),
      ysdcintdata: `INT-${uuidv4()}`,
      ysdcregsig: `SIG-${uuidv4()}`,
      ysdcmrctim: new Date().toISOString(),
      ysdctime: new Date().toISOString(),
      qr_code: `https://gra.gov.gh/verify/${uuidv4()}`,
      status: "CLEARED",
      computed_taxes: {
        base: base.toFixed(2),
        vat: vat.toFixed(2),
        nhil: nhil.toFixed(2),
        getfund: getfund.toFixed(2),
        total_tax: (vat + nhil + getfund).toFixed(2)
      }
    };

    res.json(response);
  });

  // Socket.io for live simulation
  io.on("connection", (socket) => {
    console.log("Client connected to simulator");

    // Emit current state immediately
    socket.emit("system_state", { isOffline, latency });

    socket.on("set_offline", (state) => {
      isOffline = state;
      io.emit("system_state", { isOffline, latency });
    });

    socket.on("set_latency", (ms) => {
      latency = ms;
      io.emit("system_state", { isOffline, latency });
    });

    socket.on("simulate_initialization", async () => {
      const sequence = [
        { source: "pos", target: "skmm", label: "1. Start of Day Request" },
        { source: "skmm", target: "daily_key", label: "2. Authorize & Issue" },
        { source: "daily_key", target: "vsdc", label: "Loads Auth Key" }
      ];

      let index = 0;
      const txId = "INIT-" + uuidv4().substring(0, 8);

      const interval = setInterval(() => {
        if (index >= sequence.length) {
          clearInterval(interval);
          io.emit("transaction_complete", { txId, status: "INITIALIZED" });
          return;
        }

        const currentStep = sequence[index];

        io.emit("packet", {
          txId,
          source: currentStep.source,
          target: currentStep.target,
          status: "PROCESSING",
          timestamp: Date.now(),
          payload: { step: currentStep.label, type: "SECURITY_HANDSHAKE" }
        });

        index++;
      }, 2000); // 2 seconds per step for initialization
    });

    socket.on("simulate_transaction", async (data) => {
      const sequence = [
        { source: "customer", target: "pos", label: "3. Presents Items" },
        { source: "pos", target: "vsdc", label: "4. Format JSON" },
        { source: "vsdc", target: "gateway", label: "5. HTTPS POST" },
        { source: "gateway", target: "validation_engine", label: "6. Route for Clearance" },
        { source: "validation_engine", target: "state_db", label: "8. Commit Transaction" },
        { source: "validation_engine", target: "gateway", label: "9. Return Metadata" },
        { source: "gateway", target: "vsdc", label: "10. HTTP 200 OK" },
        { source: "vsdc", target: "pos", label: "11. Cryptographic Clearance" },
        { source: "pos", target: "customer", label: "12. Print Certified Receipt" }
      ];

      let index = 0;
      const txId = uuidv4();

      const interval = setInterval(() => {
        if (index >= sequence.length) {
          clearInterval(interval);
          io.emit("transaction_complete", { txId, status: "COMMITTED" });
          return;
        }

        const currentStep = sequence[index];
        
        // Simulate failure at gateway if offline
        if (isOffline && currentStep.source === "vsdc" && currentStep.target === "gateway") {
          clearInterval(interval);
          io.emit("packet", {
            txId,
            source: "vsdc",
            target: "gateway",
            status: "FAILED",
            timestamp: Date.now(),
            error: "Connection Timeout (503)",
            payload: { error: "Connection Refused", retry_after: 30 }
          });
          
          setTimeout(() => {
            io.emit("packet", { txId, source: "gateway", target: "vsdc", status: "FAILED", label: "API Timeout / Disconnect", timestamp: Date.now(), payload: { status: 503, message: "Service Unavailable" } });
          }, 2500);
          setTimeout(() => {
            io.emit("packet", { txId, source: "vsdc", target: "local_cache", status: "PROCESSING", label: "Connection Lost (>2s latency)", timestamp: Date.now(), payload: { action: "CACHE_TRANSACTION", reason: "OFFLINE" } });
          }, 5000);
          setTimeout(() => {
            io.emit("packet", { txId, source: "local_cache", target: "pos", status: "PROCESSING", label: "Sign Locally (Provisional)", timestamp: Date.now(), payload: { signature: "LOCAL-SIG-TEMP", mode: "OFFLINE" } });
          }, 7500);
          setTimeout(() => {
            io.emit("packet", { txId, source: "pos", target: "customer", status: "PROCESSING", label: "12. Print Certified Receipt", timestamp: Date.now(), payload: { receipt_type: "PROVISIONAL", footer: "Sync Pending" } });
            io.emit("transaction_complete", { txId, status: "QUEUED_OFFLINE" });
          }, 10000);
          return;
        }

        io.emit("packet", {
          txId,
          source: currentStep.source,
          target: currentStep.target,
          status: "PROCESSING",
          timestamp: Date.now(),
          payload: { step: currentStep.label, data: "Sample Payload Data" } // Placeholder, can be enriched
        });

        index++;
      }, 4000 + (latency / 5)); // Increased base delay to 4000 for very slow visualization
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

import React, { useEffect, useState, useCallback } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  MarkerType,
  Edge,
  Node,
  Position,
  NodeMouseHandler
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Socket } from "socket.io-client";
import { Play, Wifi, WifiOff, Clock, X, FileJson, Info, ShieldCheck } from "lucide-react";

interface SimulatorProps {
  socket: Socket;
}

// Node data for click visualization
const NODE_DETAILS: Record<string, { title: string, desc: string, payload?: object }> = {
  customer: {
    title: "End Customer",
    desc: "Initiates the transaction by presenting items for purchase.",
    payload: { action: "purchase", items: ["Laptop", "Mouse"] }
  },
  pos: {
    title: "Point of Sale (POS)",
    desc: "Formats the transaction into a JSON payload compliant with GRA standards. Handles offline caching if connectivity is lost.",
    payload: { 
      flag: "INVOICE", 
      company_tin: "C123456789", 
      items: [{ name: "Laptop", price: 5000 }],
      total: 5000
    }
  },
  vsdc: {
    title: "Virtual Sales Data Controller (VSDC)",
    desc: "Middleware that signs the invoice request with the daily session key before sending to GRA.",
    payload: {
      uuid: "550e8400-e29b-...",
      signature: "PENDING",
      timestamp: "2024-02-24T10:00:00Z"
    }
  },
  gateway: {
    title: "API Gateway / Firewall",
    desc: "Secures the GRA cloud infrastructure. Rate limits and routes requests to the validation engine.",
    payload: { header: "Authorization: Bearer <DailyKey>", method: "POST /vsdc/clearance" }
  },
  validation_engine: {
    title: "Validation Engine",
    desc: "Validates tax computation logic (Act 1151: 20% effective rate). Rejects cascading tax calculations.",
    payload: { 
      validation: "PASSED", 
      computed_taxes: { vat: 750.00, nhil: 125.00, getfund: 125.00 } 
    }
  },
  state_db: {
    title: "State Database",
    desc: "Immutable ledger storing all cleared transactions for audit and reconciliation.",
    payload: { tx_id: "TX-998877", status: "COMMITTED" }
  },
  skmm: {
    title: "Security Key Management Module",
    desc: "Generates and manages cryptographic keys. Issues daily session keys to VSDCs.",
    payload: { key_id: "KEY-2024-02-24", expires_in: "24h" }
  },
  daily_key: {
    title: "Daily Session Key",
    desc: "Temporary cryptographic key used to sign invoices for a single business day.",
    payload: { algorithm: "RSA-2048", issued_at: "08:00:00" }
  },
  local_cache: {
    title: "Local Offline Cache",
    desc: "Stores signed invoices locally when the GRA API is unreachable. Syncs when online.",
    payload: { cached_txs: 5, status: "WAITING_FOR_SYNC" }
  }
};

const initialNodes: Node[] = [
  // Groups
  {
    id: "taxpayer_env",
    type: "group",
    position: { x: 300, y: 150 },
    data: { label: "Taxpayer Environment" },
    style: { width: 500, height: 400, backgroundColor: 'rgba(30, 41, 59, 0.3)', border: '1px dashed #cbd5e1', borderRadius: '8px' },
  },
  {
    id: "taxpayer_env_label",
    type: "default",
    position: { x: 310, y: 160 },
    data: { label: "Taxpayer Environment" },
    style: { background: 'transparent', border: 'none', color: '#cbd5e1', fontSize: '12px', fontWeight: 'bold', width: 'auto', padding: 0 },
    draggable: false,
    selectable: false
  },
  {
    id: "security_layer",
    type: "group",
    position: { x: 300, y: -150 },
    data: { label: "Security Layer" },
    style: { width: 500, height: 250, backgroundColor: 'rgba(6, 78, 59, 0.3)', border: '1px dashed #10b981', borderRadius: '8px' },
  },
  {
    id: "security_layer_label",
    type: "default",
    position: { x: 310, y: -140 },
    data: { label: "🔐 Cryptographic Initialization" },
    style: { background: 'transparent', border: 'none', color: '#10b981', fontSize: '12px', fontWeight: 'bold', width: 'auto', padding: 0 },
    draggable: false,
    selectable: false
  },
  {
    id: "gra_cloud",
    type: "group",
    position: { x: 900, y: 150 },
    data: { label: "GRA Cloud" },
    style: { width: 450, height: 400, backgroundColor: 'rgba(15, 23, 42, 0.3)', border: '1px dashed #38bdf8', borderRadius: '8px' },
  },
  {
    id: "gra_cloud_label",
    type: "default",
    position: { x: 910, y: 160 },
    data: { label: "GRA Cloud" },
    style: { background: 'transparent', border: 'none', color: '#38bdf8', fontSize: '12px', fontWeight: 'bold', width: 'auto', padding: 0 },
    draggable: false,
    selectable: false
  },

  // Nodes
  {
    id: "customer",
    position: { x: 50, y: 300 },
    data: { label: "End Customer" },
    sourcePosition: Position.Right,
    targetPosition: Position.Right,
    style: { background: "#1e293b", color: "#fff", border: "1px solid #cbd5e1", borderRadius: "50%", padding: "15px", width: 100, height: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', cursor: 'pointer' }
  },
  
  // Taxpayer Env
  {
    id: "pos",
    position: { x: 350, y: 300 },
    data: { label: "POS" },
    sourcePosition: Position.Right,
    targetPosition: Position.Left,
    style: { background: "#1e293b", color: "#fff", border: "1px solid #cbd5e1", borderRadius: "8px", padding: "10px", width: 120, cursor: 'pointer' }
  },
  {
    id: "vsdc",
    position: { x: 600, y: 300 },
    data: { label: "VSDC\n(Virtual Sales Data Controller)" },
    sourcePosition: Position.Right,
    targetPosition: Position.Left,
    style: { background: "#1e293b", color: "#fff", border: "1px solid #cbd5e1", borderRadius: "8px", padding: "10px", width: 140, fontSize: '10px', cursor: 'pointer' }
  },
  {
    id: "local_cache",
    position: { x: 475, y: 450 },
    data: { label: "Local Cache" },
    sourcePosition: Position.Top,
    targetPosition: Position.Top,
    style: { background: "#7f1d1d", color: "#fff", border: "2px solid #ef4444", borderRadius: "8px", padding: "10px", width: 120, cursor: 'pointer' }
  },

  // Security Layer
  {
    id: "skmm",
    position: { x: 350, y: -50 },
    data: { label: "SKMM" },
    sourcePosition: Position.Right,
    targetPosition: Position.Bottom,
    style: { background: "#064e3b", color: "#fff", border: "2px dashed #10b981", borderRadius: "8px", padding: "10px", width: 120, cursor: 'pointer' }
  },
  {
    id: "daily_key",
    position: { x: 600, y: -50 },
    data: { label: "Daily Session Key" },
    sourcePosition: Position.Bottom,
    targetPosition: Position.Left,
    style: { background: "#064e3b", color: "#fff", border: "2px dashed #10b981", borderRadius: "8px", padding: "10px", width: 120, cursor: 'pointer' }
  },

  // GRA Cloud
  {
    id: "gateway",
    position: { x: 950, y: 300 },
    data: { label: "API Gateway / Firewall" },
    sourcePosition: Position.Right,
    targetPosition: Position.Left,
    style: { background: "#0f172a", color: "#fff", border: "2px solid #38bdf8", borderRadius: "8px", padding: "10px", width: 140, cursor: 'pointer' }
  },
  {
    id: "validation_engine",
    position: { x: 1150, y: 300 },
    data: { label: "Validation Engine\n(Verify 20% Flat Rate)" },
    sourcePosition: Position.Bottom,
    targetPosition: Position.Left,
    style: { background: "#0f172a", color: "#fff", border: "2px solid #38bdf8", borderRadius: "8px", padding: "10px", width: 140, fontSize: '10px', cursor: 'pointer' }
  },
  {
    id: "state_db",
    position: { x: 1150, y: 450 },
    data: { label: "State DB" },
    sourcePosition: Position.Top,
    targetPosition: Position.Top,
    style: { background: "#451a03", color: "#fff", border: "2px solid #f59e0b", borderRadius: "8px", padding: "10px", width: 120, cursor: 'pointer' }
  }
];

const initialEdges: Edge[] = [
  // 1. State: Initialization
  { id: "e-pos-skmm", source: "pos", target: "skmm", label: "1. Start of Day", animated: false, style: { stroke: "#10b981" }, markerEnd: { type: MarkerType.ArrowClosed, color: "#10b981" } },
  { id: "e-skmm-dailykey", source: "skmm", target: "daily_key", label: "2. Authorize", animated: false, style: { stroke: "#10b981" }, markerEnd: { type: MarkerType.ArrowClosed, color: "#10b981" } },
  { id: "e-dailykey-vsdc", source: "daily_key", target: "vsdc", label: "Loads Auth Key", animated: false, style: { stroke: "#10b981", strokeDasharray: "5 5" }, markerEnd: { type: MarkerType.ArrowClosed, color: "#10b981" } },

  // 2. Flow of Data: Synchronous Transaction
  { id: "e-customer-pos", source: "customer", target: "pos", label: "3. Items", animated: false, style: { stroke: "#cbd5e1" }, markerEnd: { type: MarkerType.ArrowClosed, color: "#cbd5e1" } },
  { id: "e-pos-vsdc", source: "pos", target: "vsdc", label: "4. Format JSON", animated: false, style: { stroke: "#cbd5e1" }, markerEnd: { type: MarkerType.ArrowClosed, color: "#cbd5e1" } },
  { id: "e-vsdc-gateway", source: "vsdc", target: "gateway", label: "5. POST", animated: false, style: { stroke: "#38bdf8" }, markerEnd: { type: MarkerType.ArrowClosed, color: "#38bdf8" } },
  { id: "e-gateway-validation", source: "gateway", target: "validation_engine", label: "6. Route", animated: false, style: { stroke: "#38bdf8" }, markerEnd: { type: MarkerType.ArrowClosed, color: "#38bdf8" } },
  
  { id: "e-validation-db", source: "validation_engine", target: "state_db", label: "8. Commit", animated: false, style: { stroke: "#f59e0b" }, markerEnd: { type: MarkerType.ArrowClosed, color: "#f59e0b" } },
  { id: "e-validation-gateway", source: "validation_engine", target: "gateway", label: "9. Return", animated: false, style: { stroke: "#38bdf8" }, markerEnd: { type: MarkerType.ArrowClosed, color: "#38bdf8" } },
  { id: "e-gateway-vsdc", source: "gateway", target: "vsdc", label: "10. 200 OK", animated: false, style: { stroke: "#38bdf8" }, markerEnd: { type: MarkerType.ArrowClosed, color: "#38bdf8" } },
  { id: "e-vsdc-pos", source: "vsdc", target: "pos", label: "11. Clearance", animated: false, style: { stroke: "#cbd5e1" }, markerEnd: { type: MarkerType.ArrowClosed, color: "#cbd5e1" } },
  { id: "e-pos-customer", source: "pos", target: "customer", label: "12. Receipt", animated: false, style: { stroke: "#cbd5e1" }, markerEnd: { type: MarkerType.ArrowClosed, color: "#cbd5e1" } },

  // 3. Stateful Flow: Offline Fallback
  { id: "e-gateway-vsdc-fail", source: "gateway", target: "vsdc", label: "API Timeout", animated: false, style: { stroke: "#ef4444", strokeDasharray: "5 5", opacity: 0 }, markerEnd: { type: MarkerType.ArrowClosed, color: "#ef4444" } },
  { id: "e-vsdc-cache", source: "vsdc", target: "local_cache", label: "Lost (>2s)", animated: false, style: { stroke: "#ef4444", strokeDasharray: "5 5", opacity: 0 }, markerEnd: { type: MarkerType.ArrowClosed, color: "#ef4444" } },
  { id: "e-cache-pos", source: "local_cache", target: "pos", label: "Sign Locally", animated: false, style: { stroke: "#ef4444", strokeDasharray: "5 5", opacity: 0 }, markerEnd: { type: MarkerType.ArrowClosed, color: "#ef4444" } },
  { id: "e-cache-vsdc", source: "local_cache", target: "vsdc", label: "13. Batch Sync", animated: false, style: { stroke: "#ef4444", strokeWidth: 2, opacity: 0 }, markerEnd: { type: MarkerType.ArrowClosed, color: "#ef4444" } }
];

export function Simulator({ socket }: SimulatorProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [logs, setLogs] = useState<{time: string, msg: string, type: string}[]>([]);
  const [isOffline, setIsOffline] = useState(false);
  const [latency, setLatency] = useState(0);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  const addLog = useCallback((msg: string, type: string = "info") => {
    setLogs(prev => [{ time: new Date().toLocaleTimeString(), msg, type }, ...prev].slice(0, 50));
  }, []);

  useEffect(() => {
    socket.on("system_state", (state) => {
      setIsOffline(state.isOffline);
      setLatency(state.latency);
      addLog(`System state updated: ${state.isOffline ? 'OFFLINE' : 'ONLINE'}, Latency: ${state.latency}ms`, 'system');
    });

    socket.on("packet", (packet) => {
      addLog(`Packet from ${packet.source} to ${packet.target}: ${packet.status}`, packet.status === 'FAILED' ? 'error' : 'info');
      
      // Animate the corresponding edge
      setEdges((eds) =>
        eds.map((e) => {
          if (e.source === packet.source && e.target === packet.target) {
            return { ...e, animated: true, style: { ...e.style, stroke: packet.status === 'FAILED' ? "#ef4444" : "#10b981", strokeWidth: 2, opacity: 1 } };
          }
          return e;
        })
      );

      // Highlight node
      setNodes((nds) => 
        nds.map((n) => {
          if (n.id === packet.target || n.id === packet.source) {
            return { ...n, style: { ...n.style, borderColor: packet.status === 'FAILED' ? "#ef4444" : "#10b981", boxShadow: `0 0 15px ${packet.status === 'FAILED' ? 'rgba(239, 68, 68, 0.5)' : 'rgba(16, 185, 129, 0.5)'}` } };
          }
          return n;
        })
      );
    });

    socket.on("transaction_complete", (data) => {
      addLog(`Transaction ${data.txId.substring(0, 8)} completed: ${data.status}`, 'success');
      
      if (data.status === "INITIALIZED") {
        setIsInitialized(true);
      }

      // Reset animations after a delay
      setTimeout(() => {
        setEdges((eds) => eds.map((e) => ({ ...e, animated: false, style: { ...e.style, stroke: e.id.includes('fail') || e.id.includes('cache') ? "#ef4444" : (e.id.includes('skmm') || e.id.includes('dailykey') ? "#10b981" : (e.id.includes('validation-db') ? "#f59e0b" : (e.id.includes('gateway') || e.id.includes('validation') ? "#38bdf8" : "#cbd5e1"))), strokeWidth: 1, opacity: e.id.includes('fail') || e.id.includes('cache') ? 0 : 1 } })));
        setNodes((nds) => nds.map((n) => ({ ...n, style: { ...n.style, borderColor: n.id === 'skmm' || n.id === 'daily_key' ? "#10b981" : (n.id === 'gateway' || n.id === 'validation_engine' ? "#38bdf8" : (n.id === 'state_db' ? "#f59e0b" : (n.id === 'local_cache' ? "#ef4444" : "#cbd5e1"))), boxShadow: "none" } })));
      }, 4000);
    });

    return () => {
      socket.off("system_state");
      socket.off("packet");
      socket.off("transaction_complete");
    };
  }, [socket, addLog, setEdges, setNodes]);

  // Auto-trigger initialization after 45 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!isInitialized) {
        handleInitialize();
      }
    }, 45000);

    return () => clearTimeout(timer);
  }, [isInitialized]);

  const handleSimulate = () => {
    addLog("Initiating new transaction simulation...", "info");
    socket.emit("simulate_transaction", {});
  };

  const handleInitialize = () => {
    addLog("Starting cryptographic initialization sequence...", "system");
    socket.emit("simulate_initialization", {});
  };

  const toggleOffline = () => {
    socket.emit("set_offline", !isOffline);
  };

  const handleLatencyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    socket.emit("set_latency", parseInt(e.target.value));
  };

  const onNodeClick: NodeMouseHandler = (event, node) => {
    if (NODE_DETAILS[node.id]) {
      setSelectedNodeId(node.id);
    }
  };

  const selectedNode = selectedNodeId ? NODE_DETAILS[selectedNodeId] : null;

  return (
    <div className="h-full flex flex-col relative">
      {/* Control Bar */}
      <div className="h-16 border-b border-zinc-800 bg-zinc-900/50 flex items-center px-6 justify-between z-10">
        <div className="flex items-center gap-4">
          <button 
            onClick={handleSimulate}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
          >
            <Play size={16} />
            Send Transaction
          </button>

          <button 
            onClick={handleInitialize}
            disabled={isInitialized}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${isInitialized ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed' : 'bg-emerald-900/30 text-emerald-400 hover:bg-emerald-900/50 border border-emerald-800'}`}
          >
            <ShieldCheck size={16} />
            {isInitialized ? "System Initialized" : "Initialize Security"}
          </button>
          
          <div className="h-6 w-px bg-zinc-700 mx-2"></div>
          
          <button 
            onClick={toggleOffline}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${isOffline ? 'bg-red-500/20 text-red-400 border border-red-500/50' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'}`}
          >
            {isOffline ? <WifiOff size={16} /> : <Wifi size={16} />}
            {isOffline ? "GRA API Offline" : "GRA API Online"}
          </button>

          <div className="flex items-center gap-3 ml-4">
            <Clock size={16} className="text-zinc-400" />
            <span className="text-sm text-zinc-400">Latency: {latency}ms</span>
            <input 
              type="range" 
              min="0" 
              max="5000" 
              step="100"
              value={latency} 
              onChange={handleLatencyChange}
              className="w-32 accent-emerald-500"
            />
          </div>
        </div>
      </div>

      {/* React Flow Area */}
      <div className="flex-1 relative bg-zinc-950">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClick}
          fitView
          className="bg-zinc-950"
          colorMode="dark"
        >
          <Background color="#27272a" gap={16} />
          <Controls className="bg-zinc-800 border-zinc-700 fill-zinc-300" />
        </ReactFlow>

        {/* Live Event Log (Top Right) */}
        <div className="absolute top-4 right-4 w-80 bg-zinc-900/90 backdrop-blur-md border border-zinc-800 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-48 z-20 pointer-events-none">
          <div className="px-3 py-2 border-b border-zinc-800 bg-zinc-900 flex justify-between items-center">
            <h3 className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">Live Event Log</h3>
            <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1 pointer-events-auto">
            {logs.length === 0 ? (
              <div className="text-[10px] text-zinc-600 p-1 text-center">Waiting for events...</div>
            ) : (
              logs.map((log, i) => (
                <div key={i} className="text-[10px] font-mono p-1 rounded bg-zinc-950/50 flex gap-2">
                  <span className="text-zinc-500 shrink-0">{log.time.split(' ')[0]}</span>
                  <span className={`${log.type === 'error' ? 'text-red-400' : log.type === 'success' ? 'text-emerald-400' : log.type === 'system' ? 'text-blue-400' : 'text-zinc-300'} truncate`}>
                    {log.msg}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Node Details Panel (Bottom Left) */}
        {selectedNode && (
          <div className="absolute bottom-6 left-6 w-96 bg-zinc-900/95 backdrop-blur-md border border-zinc-700 rounded-xl shadow-2xl overflow-hidden z-20 animate-in slide-in-from-bottom-5 fade-in duration-300">
            <div className="px-4 py-3 border-b border-zinc-800 bg-zinc-900 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Info size={16} className="text-emerald-500" />
                <h3 className="text-sm font-bold text-zinc-200">{selectedNode.title}</h3>
              </div>
              <button onClick={() => setSelectedNodeId(null)} className="text-zinc-500 hover:text-zinc-300">
                <X size={16} />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <p className="text-xs text-zinc-400 leading-relaxed">
                {selectedNode.desc}
              </p>
              
              {selectedNode.payload && (
                <div className="bg-zinc-950 rounded-lg border border-zinc-800 overflow-hidden">
                  <div className="px-3 py-1.5 bg-zinc-800/50 border-b border-zinc-800 flex items-center gap-2">
                    <FileJson size={12} className="text-blue-400" />
                    <span className="text-[10px] font-mono text-blue-300 uppercase">Payload / Data Structure</span>
                  </div>
                  <pre className="p-3 text-[10px] font-mono text-zinc-300 overflow-x-auto">
                    {JSON.stringify(selectedNode.payload, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

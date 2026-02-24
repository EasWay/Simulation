import React, { useState, useEffect } from "react";
import { Simulator } from "./components/Simulator";
import { POSEmulator } from "./components/POSEmulator";
import { APITester } from "./components/APITester";
import { TaxVisualizer } from "./components/TaxVisualizer";
import { io, Socket } from "socket.io-client";
import { Activity, Server, FileText, Calculator } from "lucide-react";

export default function App() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [activeTab, setActiveTab] = useState<"simulator" | "pos" | "api" | "tax">("simulator");

  useEffect(() => {
    // Connect to the same origin
    const newSocket = io();
    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, []);

  if (!socket) return <div className="flex h-screen items-center justify-center bg-zinc-950 text-white">Connecting...</div>;

  return (
    <div className="flex h-screen bg-zinc-950 text-zinc-100 font-sans overflow-hidden">
      {/* Sidebar Navigation */}
      <div className="w-64 border-r border-zinc-800 bg-zinc-900 flex flex-col">
        <div className="p-6 border-b border-zinc-800">
          <h1 className="text-xl font-bold tracking-tight text-emerald-400">GRA e-VAT</h1>
          <p className="text-xs text-zinc-400 mt-1">Architecture Simulator</p>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          <button 
            onClick={() => setActiveTab("simulator")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === "simulator" ? "bg-emerald-500/10 text-emerald-400" : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"}`}
          >
            <Activity size={18} />
            Architecture Flow
          </button>
          <button 
            onClick={() => setActiveTab("pos")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === "pos" ? "bg-emerald-500/10 text-emerald-400" : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"}`}
          >
            <Server size={18} />
            POS Emulator
          </button>
          <button 
            onClick={() => setActiveTab("api")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === "api" ? "bg-emerald-500/10 text-emerald-400" : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"}`}
          >
            <FileText size={18} />
            API Console
          </button>
          <button 
            onClick={() => setActiveTab("tax")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === "tax" ? "bg-emerald-500/10 text-emerald-400" : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"}`}
          >
            <Calculator size={18} />
            Tax Computation
          </button>
        </nav>

        <div className="p-4 border-t border-zinc-800 text-xs text-zinc-500">
          Act 1151 Compliance Mode
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 relative h-full overflow-hidden">
        <div className={activeTab === "simulator" ? "h-full w-full" : "hidden"}>
          <Simulator socket={socket} />
        </div>
        <div className={activeTab === "pos" ? "h-full w-full" : "hidden"}>
          <POSEmulator socket={socket} />
        </div>
        <div className={activeTab === "api" ? "h-full w-full" : "hidden"}>
          <APITester />
        </div>
        <div className={activeTab === "tax" ? "h-full w-full" : "hidden"}>
          <TaxVisualizer />
        </div>
      </div>
    </div>
  );
}

import React, { useState, useEffect } from "react";
import { Socket } from "socket.io-client";
import { ShoppingCart, CreditCard, Receipt, AlertTriangle, CheckCircle2, Wifi, WifiOff } from "lucide-react";
import { v4 as uuidv4 } from "uuid";

interface POSEmulatorProps {
  socket: Socket;
}

interface CartItem {
  id: string;
  name: string;
  price: number;
  qty: number;
}

const INVENTORY = [
  { id: "1", name: "Laptop Pro", price: 5000 },
  { id: "2", name: "Wireless Mouse", price: 150 },
  { id: "3", name: "Mechanical Keyboard", price: 450 },
  { id: "4", name: "USB-C Hub", price: 200 }
];

export function POSEmulator({ socket }: POSEmulatorProps) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [receipt, setReceipt] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [offlineQueue, setOfflineQueue] = useState<any[]>([]);
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    socket.on("system_state", (state) => {
      setIsOffline(state.isOffline);
    });

    return () => {
      socket.off("system_state");
    };
  }, [socket]);

  const addToCart = (item: any) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) {
        return prev.map(i => i.id === item.id ? { ...i, qty: i.qty + 1 } : i);
      }
      return [...prev, { ...item, qty: 1 }];
    });
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(i => i.id !== id));
  };

  const total = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    
    setIsProcessing(true);
    setError(null);
    setReceipt(null);

    const payload = {
      uuid: uuidv4(),
      company_tin: "C123456789",
      items: cart,
      total: total,
      tax_rate: 0.20 // Flat 20% effective rate (Act 1151)
    };

    // Helper to handle offline queuing
    const queueOffline = () => {
      setError("GRA API Unreachable. Transaction queued locally.");
      
      const offlineReceipt = {
        ...payload,
        status: "QUEUED_OFFLINE",
        timestamp: new Date().toISOString(),
        provisional_id: `PROV-${uuidv4().substring(0, 8)}`
      };
      
      setOfflineQueue(prev => [...prev, offlineReceipt]);
      setReceipt(offlineReceipt);
      setCart([]);
      setIsProcessing(false);
    };

    // 1. Immediate Client-Side Offline Check
    if (isOffline) {
      // Simulate a small processing delay for realism
      setTimeout(queueOffline, 500);
      return;
    }

    try {
      const response = await fetch("/api/vsdc/clearance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        // Capture 503 specifically to trigger offline mode
        if (response.status === 503) {
          throw new Error("503 Service Unavailable");
        }
        throw new Error(await response.text());
      }

      const data = await response.json();
      setReceipt(data);
      setCart([]);
      setIsProcessing(false);
    } catch (err: any) {
      console.error("Checkout error:", err);
      
      // 2. Fallback for Network Errors or 503s
      if (err.message.includes("503") || err.message.includes("Failed to fetch") || err.message.includes("NetworkError")) {
        queueOffline();
        return; 
      } else {
        setError(err.message || "An unknown error occurred");
        setIsProcessing(false);
      }
    }
  };

  const syncOfflineQueue = async () => {
    if (offlineQueue.length === 0 || isOffline) return;
    
    setIsProcessing(true);
    // Simulate batch sync
    await new Promise(resolve => setTimeout(resolve, 1500));
    setOfflineQueue([]);
    setIsProcessing(false);
    alert("Offline queue synchronized successfully with GRA CIS.");
  };

  return (
    <div className="h-full flex bg-zinc-950 p-4 gap-4 overflow-hidden">
      {/* Left Column: POS Interface */}
      <div className="flex-1 flex flex-col gap-4 min-w-0 h-full">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex flex-col flex-1 min-h-0 shadow-sm">
          <div className="flex justify-between items-center mb-3 shrink-0">
            <h2 className="text-base font-semibold text-zinc-100 flex items-center gap-2">
              <ShoppingCart size={18} className="text-emerald-500" />
              Point of Sale
            </h2>
            <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold border ${isOffline ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'}`}>
              {isOffline ? <WifiOff size={10} /> : <Wifi size={10} />}
              {isOffline ? "OFFLINE" : "ONLINE"}
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-2 mb-3 shrink-0">
            {INVENTORY.map(item => (
              <button
                key={item.id}
                onClick={() => addToCart(item)}
                className="bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg p-2.5 text-left transition-colors flex justify-between items-center group"
              >
                <span className="font-medium text-zinc-200 text-xs group-hover:text-white truncate mr-2">{item.name}</span>
                <span className="text-emerald-400 font-mono text-xs whitespace-nowrap">GH¢{item.price}</span>
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto border border-zinc-800 rounded-lg bg-zinc-950 p-2 mb-3 min-h-0">
            {cart.length === 0 ? (
              <div className="h-full flex items-center justify-center text-zinc-600 text-xs italic">Cart is empty</div>
            ) : (
              <div className="space-y-1.5">
                {cart.map(item => (
                  <div key={item.id} className="flex justify-between items-center text-xs bg-zinc-900 p-2 rounded border border-zinc-800 hover:border-zinc-700 transition-colors">
                    <div className="flex items-center gap-2 overflow-hidden flex-1">
                      <span className="w-5 h-5 rounded bg-zinc-800 flex items-center justify-center text-[10px] font-bold text-white shrink-0 shadow-sm">{item.qty}</span>
                      <span className="text-zinc-200 font-medium truncate">{item.name}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-mono text-emerald-400 text-[10px]">GH¢{item.price * item.qty}</span>
                      <button 
                        onClick={() => removeFromCart(item.id)} 
                        className="text-red-400 hover:text-red-300 text-[10px] uppercase tracking-wide font-semibold px-1.5 py-0.5 rounded hover:bg-red-900/20 transition-colors"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-zinc-800 flex justify-between items-end shrink-0">
            <div>
              <div className="text-[10px] text-zinc-500 mb-0.5">Total (incl. Taxes)</div>
              <div className="text-xl font-mono font-bold text-emerald-400">GH¢{total.toFixed(2)}</div>
            </div>
            <button
              onClick={handleCheckout}
              disabled={cart.length === 0 || isProcessing}
              className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-5 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors text-xs"
            >
              {isProcessing ? "Processing..." : "Checkout"}
              <CreditCard size={14} />
            </button>
          </div>
        </div>

        {/* Offline Queue Status */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 shrink-0 h-40 flex flex-col shadow-sm">
          <div className="flex justify-between items-center mb-2 shrink-0">
            <h2 className="text-xs font-semibold text-zinc-100 flex items-center gap-2">
              <AlertTriangle size={14} className={offlineQueue.length > 0 ? "text-amber-500" : "text-zinc-500"} />
              Offline Buffer
            </h2>
            <div className="flex items-center gap-2">
              {isOffline && offlineQueue.length > 0 && (
                <span className="text-[10px] text-amber-500/80 animate-pulse">Waiting for connection...</span>
              )}
              <button 
                onClick={syncOfflineQueue}
                disabled={offlineQueue.length === 0 || isOffline || isProcessing}
                className="text-[10px] bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-zinc-300 px-2 py-1 rounded transition-colors border border-zinc-700 flex items-center gap-1"
                title={isOffline ? "Cannot sync while offline" : "Sync offline transactions"}
              >
                {isProcessing ? "Syncing..." : "Sync Now"}
                {!isOffline && offlineQueue.length > 0 && <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-500"></span>}
              </button>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto space-y-1.5 min-h-0 pr-1">
            {offlineQueue.length === 0 ? (
              <div className="h-full flex items-center justify-center text-zinc-700 text-[10px]">Queue is empty.</div>
            ) : (
              offlineQueue.map((q, i) => (
                <div key={i} className="bg-zinc-950 border border-zinc-800 p-2 rounded flex justify-between items-center text-[10px]">
                  <span className="font-mono text-zinc-500">{q.provisional_id}</span>
                  <span className="text-amber-500 font-medium">GH¢{q.total.toFixed(2)}</span>
                  <span className="text-zinc-600">{new Date(q.timestamp).toLocaleTimeString()}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Right Column: Receipt Output */}
      <div className="w-80 bg-zinc-900 border border-zinc-800 rounded-xl p-6 flex flex-col shrink-0">
        <h2 className="text-lg font-semibold text-zinc-100 mb-4 flex items-center gap-2 shrink-0">
          <Receipt size={20} className="text-emerald-500" />
          Receipt Output
        </h2>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg text-xs mb-4 shrink-0">
            {error}
          </div>
        )}

        {receipt ? (
          <div className="flex-1 bg-white rounded-lg p-5 text-black font-mono text-[10px] leading-tight overflow-y-auto shadow-inner min-h-0">
            <div className="text-center mb-4">
              <h3 className="font-bold text-sm mb-1">MELCOM GHANA LTD</h3>
              <p>TIN: {receipt.distributor_tin || receipt.company_tin}</p>
              <p>Accra, Ghana</p>
            </div>

            <div className="border-b border-dashed border-gray-400 pb-3 mb-3">
              <div className="flex justify-between mb-1">
                <span>Receipt No:</span>
                <span>{receipt.num || receipt.provisional_id}</span>
              </div>
              <div className="flex justify-between mb-1">
                <span>Date:</span>
                <span>{new Date(receipt.ysdctime || receipt.timestamp).toLocaleString()}</span>
              </div>
              <div className="flex justify-between mb-1">
                <span>Status:</span>
                <span className={receipt.status === "CLEARED" ? "text-green-600 font-bold" : "text-amber-600 font-bold"}>
                  {receipt.status}
                </span>
              </div>
            </div>

            <div className="border-b border-dashed border-gray-400 pb-3 mb-3">
              <div className="font-bold mb-2 flex justify-between">
                <span>Item</span>
                <span>Amount</span>
              </div>
              {(receipt.items || cart).map((item: any, i: number) => (
                <div key={i} className="flex justify-between mb-1">
                  <span>{item.qty}x {item.name}</span>
                  <span>{item.price * item.qty}.00</span>
                </div>
              ))}
            </div>

            {receipt.computed_taxes ? (
              <div className="border-b border-dashed border-gray-400 pb-3 mb-3">
                <div className="flex justify-between mb-1">
                  <span>Taxable Base:</span>
                  <span>{receipt.computed_taxes.base}</span>
                </div>
                <div className="flex justify-between mb-1">
                  <span>VAT (15%):</span>
                  <span>{receipt.computed_taxes.vat}</span>
                </div>
                <div className="flex justify-between mb-1">
                  <span>NHIL (2.5%):</span>
                  <span>{receipt.computed_taxes.nhil}</span>
                </div>
                <div className="flex justify-between mb-1">
                  <span>GETFund (2.5%):</span>
                  <span>{receipt.computed_taxes.getfund}</span>
                </div>
              </div>
            ) : (
              <div className="border-b border-dashed border-gray-400 pb-3 mb-3 text-center text-gray-500 italic">
                Tax computation pending sync
              </div>
            )}

            <div className="flex justify-between text-sm font-bold mb-4">
              <span>TOTAL GHS:</span>
              <span>{receipt.total.toFixed(2)}</span>
            </div>

            {receipt.ysdcregsig && (
              <div className="text-center border border-gray-300 p-2 rounded bg-gray-50 break-all">
                <p className="font-bold mb-1">GRA Signature</p>
                <p className="text-[8px] text-gray-600 leading-snug">{receipt.ysdcregsig}</p>
                <p className="text-[8px] text-gray-600 mt-1">SDC ID: {receipt.ysdcid}</p>
              </div>
            )}
            
            {receipt.status === "QUEUED_OFFLINE" && (
              <div className="text-center border border-dashed border-amber-400 p-2 rounded bg-amber-50 mt-3">
                <p className="font-bold text-amber-700 mb-1">OFFLINE RECEIPT</p>
                <p className="text-[8px] text-amber-600">Provisional receipt. Official GRA signature pending network restoration.</p>
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center border-2 border-dashed border-zinc-800 rounded-lg text-zinc-600 text-xs">
            Complete a transaction to view receipt
          </div>
        )}
      </div>
    </div>
  );
}

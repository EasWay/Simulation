import React, { useState } from "react";
import { Send, Code, Database, Server } from "lucide-react";
import { v4 as uuidv4 } from "uuid";

export function APITester() {
  const [endpoint, setEndpoint] = useState("/api/vsdc/clearance");
  const [method, setMethod] = useState("POST");
  const [payload, setPayload] = useState(JSON.stringify({
    uuid: uuidv4(),
    company_tin: "C123456789",
    items: [
      { name: "Laptop", qty: 1, price: 5000 }
    ],
    tax_rate: 0.20,
    total: 6000
  }, null, 2));
  const [response, setResponse] = useState<string | null>(null);
  const [status, setStatus] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    setLoading(true);
    setResponse(null);
    setStatus(null);

    try {
      const res = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json",
          "COMPANY_TIN": "C123456789",
          "COMPANY_SECURITY_KEY": "sk_test_12345"
        },
        body: method !== "GET" ? payload : undefined
      });

      setStatus(res.status);
      const data = await res.json();
      setResponse(JSON.stringify(data, null, 2));
    } catch (err: any) {
      setStatus(500);
      setResponse(JSON.stringify({ error: err.message }, null, 2));
    } finally {
      setLoading(false);
    }
  };

  const loadExample = (type: string) => {
    if (type === "invoice") {
      setPayload(JSON.stringify({
        uuid: uuidv4(),
        company_tin: "C123456789",
        flag: "INVOICE",
        items: [
          { name: "Laptop", qty: 1, price: 5000 }
        ],
        tax_rate: 0.20,
        total: 6000
      }, null, 2));
    } else if (type === "refund") {
      setPayload(JSON.stringify({
        uuid: uuidv4(),
        company_tin: "C123456789",
        flag: "REFUND_CANCELLATION",
        refund_id: `SDC-${uuidv4().substring(0, 8)}`,
        items: [
          { name: "Laptop", qty: 1, price: 5000 }
        ],
        tax_rate: 0.20,
        total: -6000
      }, null, 2));
    }
  };

  return (
    <div className="h-full flex flex-col bg-zinc-950 p-6 gap-6 overflow-hidden">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xl font-semibold text-zinc-100 flex items-center gap-2">
          <Code size={24} className="text-emerald-500" />
          GRA API Explorer
        </h2>
        <div className="flex gap-2">
          <button onClick={() => loadExample("invoice")} className="text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-3 py-1.5 rounded transition-colors">Load Invoice</button>
          <button onClick={() => loadExample("refund")} className="text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-3 py-1.5 rounded transition-colors">Load Refund</button>
        </div>
      </div>

      <div className="flex gap-4 mb-4">
        <select 
          value={method}
          onChange={(e) => setMethod(e.target.value)}
          className="bg-zinc-900 border border-zinc-800 text-emerald-400 font-mono font-bold px-4 py-2 rounded-lg focus:outline-none focus:border-emerald-500"
        >
          <option>POST</option>
          <option>GET</option>
        </select>
        <input 
          type="text" 
          value={endpoint}
          onChange={(e) => setEndpoint(e.target.value)}
          className="flex-1 bg-zinc-900 border border-zinc-800 text-zinc-100 font-mono px-4 py-2 rounded-lg focus:outline-none focus:border-emerald-500"
        />
        <button 
          onClick={handleSend}
          disabled={loading}
          className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white px-6 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors"
        >
          {loading ? "Sending..." : "Send Request"}
          <Send size={16} />
        </button>
      </div>

      <div className="flex-1 grid grid-cols-2 gap-6 min-h-0">
        {/* Request Payload */}
        <div className="flex flex-col bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          <div className="bg-zinc-800/50 px-4 py-2 border-b border-zinc-800 flex items-center gap-2 text-sm font-medium text-zinc-300">
            <Database size={16} className="text-emerald-500" />
            Request Body (JSON)
          </div>
          <textarea 
            value={payload}
            onChange={(e) => setPayload(e.target.value)}
            className="flex-1 bg-transparent text-zinc-300 font-mono text-sm p-4 focus:outline-none resize-none"
            spellCheck="false"
          />
        </div>

        {/* Response */}
        <div className="flex flex-col bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          <div className="bg-zinc-800/50 px-4 py-2 border-b border-zinc-800 flex items-center justify-between text-sm font-medium text-zinc-300">
            <div className="flex items-center gap-2">
              <Server size={16} className="text-emerald-500" />
              Response
            </div>
            {status && (
              <span className={`px-2 py-0.5 rounded text-xs font-mono font-bold ${status >= 200 && status < 300 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                {status} {status === 200 ? 'OK' : status === 503 ? 'Service Unavailable' : 'Error'}
              </span>
            )}
          </div>
          <div className="flex-1 bg-zinc-950 p-4 overflow-auto">
            {response ? (
              <pre className="text-zinc-300 font-mono text-sm whitespace-pre-wrap">
                {response}
              </pre>
            ) : (
              <div className="h-full flex items-center justify-center text-zinc-600 text-sm italic">
                Hit "Send Request" to view response
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

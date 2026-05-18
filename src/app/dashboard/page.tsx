"use client";

import { useEffect, useState, useRef, useCallback } from "react";

interface Assignment {
  leadId: number;
  leadName: string;
  serviceName: string;
  assignedAt: string;
}

interface Provider {
  id: number;
  name: string;
  monthlyQuota: number;
  currentMonthLeads: number;
  remaining: number;
  assignments: Assignment[];
}

export default function DashboardPage() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [sseMode, setSseMode] = useState<"sse" | "polling">("sse");
  const eventSourceRef = useRef<EventSource | null>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const sseFailedRef = useRef(false);

  const fetchProviders = useCallback(async () => {
    try {
      const res = await fetch("/api/providers");
      if (res.ok) {
        const data = await res.json();
        setProviders(data);
      }
    } catch {
      // ignore fetch errors
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProviders();

    const connectSSE = () => {
      try {
        const es = new EventSource("/api/sse");
        eventSourceRef.current = es;

        es.onmessage = () => {
          fetchProviders();
        };

        es.onerror = () => {
          es.close();
          eventSourceRef.current = null;
          if (!sseFailedRef.current) {
            sseFailedRef.current = true;
            setSseMode("polling");
            startPolling();
          }
        };
      } catch {
        sseFailedRef.current = true;
        setSseMode("polling");
        startPolling();
      }
    };

    const startPolling = () => {
      if (pollingRef.current) return;
      pollingRef.current = setInterval(fetchProviders, 3000);
    };

    connectSSE();

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [fetchProviders]);

  const getQuotaColor = (remaining: number, quota: number) => {
    const pct = remaining / quota;
    if (pct > 0.5) return "bg-green-500";
    if (pct > 0.2) return "bg-yellow-500";
    return "bg-red-500";
  };

  if (loading) {
    return (
      <div className="flex-1 p-8 bg-gray-50">
        <p className="text-gray-600">Loading providers...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 p-8 bg-gray-50">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>
      <p className="text-sm text-gray-500 mb-4">
        Auto-updates via {sseMode === "sse" ? "SSE" : "polling (3s fallback)"}
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {providers.map((provider) => (
          <div
            key={provider.id}
            className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm"
          >
            <h2 className="text-lg font-semibold text-gray-900">
              {provider.name}
            </h2>

            <div className="mt-2">
              <div className="flex justify-between text-sm text-gray-600 mb-1">
                <span>
                  {provider.currentMonthLeads} / {provider.monthlyQuota}
                </span>
                <span>Remaining: {provider.remaining}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${getQuotaColor(provider.remaining, provider.monthlyQuota)}`}
                  style={{
                    width: `${Math.min((provider.currentMonthLeads / provider.monthlyQuota) * 100, 100)}%`,
                  }}
                />
              </div>
            </div>

            {provider.assignments.length > 0 && (
              <div className="mt-3">
                <p className="text-xs font-medium text-gray-500 mb-1">
                  Assigned Leads:
                </p>
                <ul className="space-y-1">
                  {provider.assignments.slice(0, 5).map((a, i) => (
                    <li key={i} className="text-xs text-gray-600">
                      <span className="font-medium">{a.serviceName}</span>
                      {" — "}
                      {a.leadName} ({new Date(a.assignedAt).toLocaleString()})
                    </li>
                  ))}
                  {provider.assignments.length > 5 && (
                    <li className="text-xs text-gray-400">
                      +{provider.assignments.length - 5} more
                    </li>
                  )}
                </ul>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

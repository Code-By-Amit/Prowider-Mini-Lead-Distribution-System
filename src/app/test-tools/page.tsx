"use client";

import { useState } from "react";

export default function TestToolsPage() {
  const [idempotencyKey, setIdempotencyKey] = useState(() =>
    crypto.randomUUID()
  );
  const [resetResult, setResetResult] = useState<string | null>(null);
  const [resetLoading, setResetLoading] = useState(false);

  const [bulkResult, setBulkResult] = useState<{
    total: number;
    succeeded: number;
    failed: number;
    duplicates: number;
  } | null>(null);
  const [bulkLoading, setBulkLoading] = useState(false);

  const handleResetQuota = async () => {
    setResetLoading(true);
    setResetResult(null);
    try {
      const res = await fetch("/api/webhook/quota-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idempotencyKey }),
      });
      const data = await res.json();
      setResetResult(
        data.success
          ? `${data.message || "Quotas reset successfully"}`
          : `Error: ${data.error}`
      );
    } catch (err) {
      setResetResult("Network error");
    } finally {
      setResetLoading(false);
    }
  };

  const handleGenerateKey = () => {
    setIdempotencyKey(crypto.randomUUID());
  };

  const handleBulkLeads = async () => {
    setBulkLoading(true);
    setBulkResult(null);
    try {
      const res = await fetch("/api/test/bulk-leads", { method: "POST" });
      const data = await res.json();
      setBulkResult({
        total: data.total,
        succeeded: data.succeeded,
        failed: data.failed,
        duplicates: data.duplicates,
      });
    } catch (err) {
      setBulkResult({ total: 0, succeeded: 0, failed: 10, duplicates: 0 });
    } finally {
      setBulkLoading(false);
    }
  };

  return (
    <div className="flex-1 p-8 bg-gray-50">
      <div className="max-w-2xl mx-auto space-y-8">
        <h1 className="text-2xl font-bold text-gray-900">Test Tools</h1>

        {/* Section 1: Reset Quota */}
        <section className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Section 1 — Reset Quota
          </h2>

          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Idempotency Key
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={idempotencyKey}
                  onChange={(e) => setIdempotencyKey(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={handleGenerateKey}
                  className="px-3 py-2 bg-gray-200 text-gray-700 rounded-md text-sm hover:bg-gray-300"
                >
                  New Key
                </button>
              </div>
            </div>

            <button
              onClick={handleResetQuota}
              disabled={resetLoading}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 font-medium"
            >
              {resetLoading ? "Resetting..." : "Reset All Quotas"}
            </button>

            {resetResult && (
              <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded border">
                {resetResult}
              </p>
            )}

            <p className="text-xs text-gray-500">
              Call with the same key again to test idempotency — you should see
              &ldquo;Already processed&rdquo;.
            </p>
          </div>
        </section>

        {/* Section 2: Bulk Lead Generator */}
        <section className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Section 2 — Bulk Lead Generator
          </h2>

          <div className="space-y-3">
            <button
              onClick={handleBulkLeads}
              disabled={bulkLoading}
              className="px-4 py-2 bg-amber-600 text-white rounded-md hover:bg-amber-700 disabled:opacity-50 font-medium"
            >
              {bulkLoading ? "Generating..." : "Generate 10 Simultaneous Leads"}
            </button>

            {bulkResult && (
              <div className="text-sm bg-gray-50 p-3 rounded border space-y-1">
                <p>Total: {bulkResult.total}</p>
                <p className="text-green-700">Succeeded: {bulkResult.succeeded}</p>
                <p className="text-red-700">Failed: {bulkResult.failed}</p>
                <p className="text-yellow-700">Duplicates: {bulkResult.duplicates}</p>
              </div>
            )}

            <p className="text-xs text-gray-500">
              Fires 10 concurrent POST requests to /api/leads using Promise.all.
              Tests the SELECT FOR UPDATE locking mechanism.
            </p>
          </div>
        </section>

        {/* Section 3: Info Box */}
        <section className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-blue-900 mb-2">
            Info
          </h2>
          <p className="text-sm text-blue-800">
            Quota reset only works through the{" "}
            <code className="bg-blue-100 px-1 rounded">/api/webhook/quota-reset</code>{" "}
            endpoint. It cannot be triggered from the normal user UI. This
            endpoint uses an idempotency key to ensure that the same reset
            request is never processed twice.
          </p>
        </section>
      </div>
    </div>
  );
}

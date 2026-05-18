import { NextResponse } from "next/server";

const CITIES = ["New York", "Los Angeles", "Chicago", "Houston", "Phoenix", "Philadelphia", "San Antonio", "San Diego"];

export async function POST() {
  try {
    const results: { success: boolean; leadId?: number; assignedProviders?: number[]; error?: string }[] = [];

    const baseTime = Date.now();
    const promises = Array.from({ length: 10 }, (_, i) => {
      const serviceId = (i % 3) + 1;
      const phone = `BULK-${baseTime}-${i}-${Math.random().toString(36).slice(2, 8)}`;
      const city = CITIES[Math.floor(Math.random() * CITIES.length)];

      return fetch(`${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/leads`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `Bulk Lead ${i + 1}`,
          phone,
          city,
          serviceId,
          description: `Bulk test lead #${i + 1}`,
        }),
      })
        .then(async (res) => {
          const data = await res.json();
          if (res.ok) {
            return {
              success: true,
              leadId: data.leadId,
              assignedProviders: data.assignedProviders,
            };
          } else {
            return {
              success: false,
              error: data.error || `HTTP ${res.status}`,
            };
          }
        })
        .catch((err) => ({
          success: false,
          error: err.message,
        }));
    });

    const settled = await Promise.all(promises);
    results.push(...settled);

    const succeeded = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success && r.error !== "Duplicate: same phone number already has a lead for this service").length;
    const duplicates = results.filter((r) => r.error === "Duplicate: same phone number already has a lead for this service").length;

    return NextResponse.json({
      total: results.length,
      succeeded,
      failed,
      duplicates,
      results,
    });
  } catch (error) {
    console.error("Error in bulk lead generation:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
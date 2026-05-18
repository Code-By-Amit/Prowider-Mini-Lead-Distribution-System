import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const providers = await prisma.provider.findMany({
      include: {
        assignments: {
          include: {
            lead: {
              include: {
                service: true,
              },
            },
          },
          orderBy: { assignedAt: "desc" },
        },
      },
      orderBy: { id: "asc" },
    });

    const result = providers.map((provider) => ({
      id: provider.id,
      name: provider.name,
      monthlyQuota: provider.monthlyQuota,
      currentMonthLeads: provider.currentMonthLeads,
      remaining: provider.monthlyQuota - provider.currentMonthLeads,
      assignments: provider.assignments.map((a) => ({
        leadId: a.leadId,
        leadName: a.lead.name,
        serviceName: a.lead.service.name,
        assignedAt: a.assignedAt,
      })),
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching providers:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

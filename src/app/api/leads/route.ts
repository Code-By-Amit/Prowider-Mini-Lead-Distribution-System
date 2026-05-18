import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { allocateProviders } from "@/lib/allocation";
import { broadcast } from "@/lib/sse-emitter";
import { Prisma } from "@prisma/client";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, phone, city, serviceId, description } = body;

    if (!name || !phone || !city || !serviceId || !description) {
      return NextResponse.json(
        { error: "All fields are required: name, phone, city, serviceId, description" },
        { status: 400 }
      );
    }

    const serviceIdNum = Number(serviceId);
    if (isNaN(serviceIdNum)) {
      return NextResponse.json(
        { error: "serviceId must be a number" },
        { status: 400 }
      );
    }

    // Verify service exists
    const service = await prisma.service.findUnique({
      where: { id: serviceIdNum },
    });
    if (!service) {
      return NextResponse.json(
        { error: "Service not found" },
        { status: 404 }
      );
    }

    let leadId: number;
    let assignedProviders: number[];

    try {
      const result = await prisma.$transaction(async (tx) => {
        // Create the lead
        const lead = await tx.lead.create({
          data: {
            name,
            phone,
            city,
            description,
            serviceId: serviceIdNum,
          },
        });

        // Allocate providers within the same transaction
        const assigned = await allocateProviders(tx, lead.id, serviceIdNum);

        return { leadId: lead.id, assignedProviders: assigned };
      });

      leadId = result.leadId;
      assignedProviders = result.assignedProviders;
    } catch (error) {
      // Handle duplicate lead (unique constraint on phone + serviceId)
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        return NextResponse.json(
          {
            error:
              "Duplicate: same phone number already has a lead for this service",
          },
          { status: 409 }
        );
      }
      throw error;
    }

    // Fetch assigned provider names for the response
    const assignedProviderDetails = await prisma.provider.findMany({
      where: { id: { in: assignedProviders } },
      select: { id: true, name: true },
    });

    // Broadcast SSE event after successful transaction
    broadcast({ type: "NEW_LEAD", leadId, serviceId: serviceIdNum, assignedProviders });

    return NextResponse.json({
      success: true,
      leadId,
      assignedProviders,
      assignedProviderDetails,
    });
  } catch (error) {
    console.error("Error creating lead:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

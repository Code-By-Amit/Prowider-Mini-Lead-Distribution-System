import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { broadcast } from "@/lib/sse-emitter";
import { Prisma } from "@prisma/client";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { idempotencyKey, providerId } = body;

    if (!idempotencyKey) {
      return NextResponse.json(
        { error: "idempotencyKey is required" },
        { status: 400 }
      );
    }

    try {
      await prisma.$transaction(async (tx) => {
        // Try to insert the webhook event for idempotency tracking
        await tx.webhookEvent.create({
          data: {
            idempotencyKey,
            eventType: "QUOTA_RESET",
          },
        });

        // Reset currentMonthLeads
        if (providerId) {
          const providerIdNum = Number(providerId);
          await tx.provider.update({
            where: { id: providerIdNum },
            data: { currentMonthLeads: 0 },
          });
        } else {
          // Reset all providers
          await tx.provider.updateMany({
            data: { currentMonthLeads: 0 },
          });
        }

        // Reset all AllocationState currentIndex values to 0
        await tx.allocationState.updateMany({
          data: { currentIndex: 0 },
        });
      });
    } catch (error) {
      // Handle idempotency: if idempotencyKey already exists, return success
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        return NextResponse.json({
          success: true,
          message: "Already processed",
        });
      }
      throw error;
    }

    // Broadcast SSE event
    broadcast({ type: "QUOTA_RESET" });

    return NextResponse.json({
      success: true,
      message: providerId
        ? `Quota reset for Provider ${providerId}`
        : "All quotas reset",
    });
  } catch (error) {
    console.error("Error resetting quota:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
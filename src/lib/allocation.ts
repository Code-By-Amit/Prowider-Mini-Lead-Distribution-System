import { Prisma } from "@prisma/client";

// Mandatory providers per service
const MANDATORY_PROVIDERS: Record<number, number[]> = {
  1: [1],
  2: [5],
  3: [1, 4],
};

const TARGET_ASSIGNMENTS = 3;

interface AllocationStateRow {
  id: number;
  serviceId: number;
  poolOrder: number[];
  currentIndex: number;
}

export async function allocateProviders( tx: Prisma.TransactionClient, leadId: number, serviceId: number): Promise<number[]> {
  // Step 1: Lock the AllocationState row for this service using SELECT FOR UPDATE
  // const states = await tx.$queryRaw<AllocationStateRow[]>`
  //   SELECT id, "serviceId", "poolOrder", "currentIndex"
  //   FROM "AllocationState"
  //   WHERE "serviceId" = ${serviceId}
  //   FOR UPDATE-
  // `;

  const states = await tx.$queryRaw<AllocationStateRow[]>(
  Prisma.sql`
    SELECT id, "serviceId", "poolOrder", "currentIndex"
    FROM "AllocationState"
    WHERE "serviceId" = ${serviceId}
    FOR UPDATE
  `
);

  if (states.length === 0) {
    throw new Error(`No AllocationState found for serviceId ${serviceId}`);
  }

  const state = states[0];
  const assigned: number[] = [];

  // Step 2: Assign mandatory providers (if under quota)
  const mandatoryIds = MANDATORY_PROVIDERS[serviceId] || [];
  for (const providerId of mandatoryIds) {
    if (assigned.length >= TARGET_ASSIGNMENTS) break;

    const provider = await tx.provider.findUnique({
      where: { id: providerId },
    });

    // Mandatory providers respect quota — skip if over quota
    if (provider && provider.currentMonthLeads < provider.monthlyQuota) {
      assigned.push(providerId);
    }
  }

  // Step 3: Fill remaining slots from the fair pool using round-robin
  const pool = state.poolOrder;
  let index = state.currentIndex;

  if (assigned.length < TARGET_ASSIGNMENTS && pool.length > 0) {
    // Iterate through the pool. For each slot we need to fill, we scan
    // at most pool.length positions to find an eligible provider.
    // We track a global scan count to avoid infinite loops.
    let scannedSinceLastAssignment = 0;

    while (assigned.length < TARGET_ASSIGNMENTS && scannedSinceLastAssignment < pool.length) {
      const wrappedIndex = index % pool.length;
      const candidateId = pool[wrappedIndex];
      index++;
      scannedSinceLastAssignment++;

      // Skip if already assigned to this lead
      if (assigned.includes(candidateId)) {
        continue;
      }

      // Check quota
      const candidate = await tx.provider.findUnique({
        where: { id: candidateId },
      });

      if (candidate && candidate.currentMonthLeads < candidate.monthlyQuota) {
        assigned.push(candidateId);
        scannedSinceLastAssignment = 0;
      }
    }

    // Step 4: Update currentIndex in AllocationState
    await tx.allocationState.update({
      where: { serviceId },
      data: { currentIndex: index % pool.length },
    });
  }

  // Step 5: Create LeadAssignment rows and increment currentMonthLeads
  for (const providerId of assigned) {
    await tx.leadAssignment.create({
      data: {
        leadId,
        providerId,
        assignedAt: new Date(),
      },
    });

    await tx.provider.update({
      where: { id: providerId },
      data: { currentMonthLeads: { increment: 1 } },
    });
  }

  // Step 6: Return assigned provider IDs
  return assigned;
}

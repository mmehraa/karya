import { db } from "@/lib/db";
import { getActiveBusinessIdFromCookie } from "./tenant-resolution";

export async function getDashboardContext() {
  const businessId = await getActiveBusinessIdFromCookie();

  if (!businessId) {
    throw new Error("No active business selected.");
  }

  const business = await db.business.findUnique({
    where: {
      id: businessId,
    },
    include: {
      currentStage: true,
    },
  });

  if (!business) {
    throw new Error("Active business was not found.");
  }

  return {
    business,
    businessId: business.id,
  };
}
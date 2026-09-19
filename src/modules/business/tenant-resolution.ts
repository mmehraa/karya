import { cookies } from "next/headers";
import { db } from "@/lib/db";

export const ACTIVE_BUSINESS_COOKIE = "bos_active_business_id";

/**
 * Sets the active business ID in an HTTP-only cookie.
 * Call this only from a Server Action or Route Handler.
 */
export async function setActiveBusinessId(
  businessId: string
): Promise<void> {
  const cookieStore = await cookies();

  cookieStore.set(ACTIVE_BUSINESS_COOKIE, businessId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
}

/**
 * Clears the active business cookie.
 * Call this only from a Server Action or Route Handler.
 */
export async function clearActiveBusinessId(): Promise<void> {
  const cookieStore = await cookies();

  cookieStore.delete(ACTIVE_BUSINESS_COOKIE);
}

/**
 * Reads the active business ID from the current request cookie.
 * This function does not mutate cookies.
 */
export async function getActiveBusinessIdFromCookie(): Promise<
  string | null
> {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(ACTIVE_BUSINESS_COOKIE);

  return cookie?.value ?? null;
}

/**
 * Returns the number of businesses currently registered.
 */
export async function getBusinessCount(): Promise<number> {
  return db.business.count();
}

/**
 * Returns businesses available for local business selection.
 */
export async function getAvailableBusinesses(): Promise<
  Array<{
    id: string;
    name: string;
    slug: string;
    industry: string;
  }>
> {
  return db.business.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
      industry: true,
    },
    orderBy: {
      name: "asc",
    },
  });
}
import { redirect } from "next/navigation";
import {
  getActiveBusinessIdFromCookie,
  getBusinessCount,
} from "@/modules/business/tenant-resolution";

export default async function RootPage() {
  const businessId = await getActiveBusinessIdFromCookie();

  if (businessId) {
    redirect("/dashboard");
  }

  const businessCount = await getBusinessCount();

  if (businessCount === 0) {
    redirect("/onboarding");
  }

  redirect("/select-business");
}
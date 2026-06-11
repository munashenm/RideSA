import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { NotificationsPageClient } from "./NotificationsPageClient";

export default async function NotificationsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/notifications");

  return <NotificationsPageClient />;
}

import PageClient from "../../../src/PageClient";
import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function SettingsRoutePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=%2Fsettings");

  return <PageClient screen="settings" />;
}

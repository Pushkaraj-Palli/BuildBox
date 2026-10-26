import PageClient from "../../../src/PageClient";
import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function WorkspaceRoutePage({ params }: { params: Promise<{ project: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    const { project } = await params;
    redirect(`/login?callbackUrl=${encodeURIComponent(`/workspace/${project}`)}`);
  }

  return <PageClient screen="workspace" />;
}

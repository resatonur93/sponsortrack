import { redirect } from "next/navigation";
import { prismaBase } from "@/lib/prisma";
import { SetupDbUnavailable } from "@/components/auth/AuthServiceNotice";
import { OrgSignupForm } from "@/components/auth/OrgSignupForm";

export const dynamic = "force-dynamic";

export default async function SetupPage(): Promise<JSX.Element> {
  let count: number;
  try {
    count = await prismaBase.user.count();
  } catch {
    return <SetupDbUnavailable />;
  }
  if (count > 0) {
    redirect("/login");
  }
  return <OrgSignupForm mode="setup" />;
}

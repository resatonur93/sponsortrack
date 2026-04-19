import { redirect } from "next/navigation";
import { prismaBase } from "@/lib/prisma";
import { SetupDbUnavailable } from "@/components/auth/AuthServiceNotice";
import { OrgSignupForm } from "@/components/auth/OrgSignupForm";
import { getSetupErrorHint } from "@/lib/prisma-setup-error";

export const dynamic = "force-dynamic";

export default async function SetupPage(): Promise<JSX.Element> {
  let count: number;
  try {
    count = await prismaBase.user.count();
  } catch (e) {
    return <SetupDbUnavailable hint={getSetupErrorHint(e)} />;
  }
  if (count > 0) {
    redirect("/login");
  }
  return <OrgSignupForm mode="setup" />;
}

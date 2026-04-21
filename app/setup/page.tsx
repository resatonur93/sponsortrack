import { prismaBase } from "@/lib/prisma";
import { SetupDbUnavailable } from "@/components/auth/AuthServiceNotice";
import { OrgSignupForm } from "@/components/auth/OrgSignupForm";
import { getSetupErrorHint } from "@/lib/prisma-setup-error";

export const dynamic = "force-dynamic";

export default async function SetupPage(): Promise<JSX.Element> {
  try {
    await prismaBase.user.findFirst({ select: { id: true } });
  } catch (e) {
    return <SetupDbUnavailable hint={getSetupErrorHint(e)} />;
  }
  return <OrgSignupForm mode="setup" />;
}

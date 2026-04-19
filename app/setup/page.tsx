import { redirect } from "next/navigation";
import { prismaBase } from "@/lib/prisma";
import { OrgSignupForm } from "@/components/auth/OrgSignupForm";

export default async function SetupPage(): Promise<JSX.Element> {
  const count = await prismaBase.user.count();
  if (count > 0) {
    redirect("/login");
  }
  return <OrgSignupForm mode="setup" />;
}

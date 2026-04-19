import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prismaBase } from "@/lib/prisma";

export default async function Home(): Promise<never> {
  const session = await getServerSession(authOptions);
  if (session?.user) {
    redirect("/dashboard");
  }
  const userCount = await prismaBase.user.count();
  if (userCount === 0) {
    redirect("/setup");
  }
  redirect("/login");
}

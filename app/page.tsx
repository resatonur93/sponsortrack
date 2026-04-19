import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export default async function Home(): Promise<never> {
  const session = await getServerSession(authOptions);
  if (session?.user) {
    redirect("/dashboard");
  }
  redirect("/login");
}

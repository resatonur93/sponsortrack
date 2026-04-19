import { redirect } from "next/navigation";
import { OrgSignupForm } from "@/components/auth/OrgSignupForm";

export default function RegisterPage(): JSX.Element {
  if (!process.env.REGISTRATION_SECRET?.trim()) {
    redirect("/login");
  }
  return <OrgSignupForm mode="register" />;
}

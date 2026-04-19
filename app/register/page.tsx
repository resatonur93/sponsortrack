import { RegistrationNotConfigured } from "@/components/auth/AuthServiceNotice";
import { OrgSignupForm } from "@/components/auth/OrgSignupForm";

export const dynamic = "force-dynamic";

export default function RegisterPage(): JSX.Element {
  if (!process.env.REGISTRATION_SECRET?.trim()) {
    return <RegistrationNotConfigured />;
  }
  return <OrgSignupForm mode="register" />;
}

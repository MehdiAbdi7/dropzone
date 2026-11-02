import type { Metadata } from "next";
import LoginForm from "@/features/auth/LoginForm";

export const metadata: Metadata = { title: "Connexion" };

export default async function LoginPage({ searchParams }: PageProps<"/connexion">) {
  const { suite } = await searchParams;
  return (
    <div className="container-page space-y-6 py-10">
      <h1 className="text-3xl">Connexion</h1>
      <LoginForm suite={typeof suite === "string" ? suite : undefined} />
    </div>
  );
}

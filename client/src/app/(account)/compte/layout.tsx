import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/serverFetch";

// Deuxième couche de protection : le cookie existe (vérifié par proxy.ts), mais
// est-il valable ? Le serveur de Next demande à l'API qui est connecté.
export default async function AccountAreaLayout({ children }: LayoutProps<"/compte">) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/connexion?suite=/compte");
  }
  return <div className="container-page py-10">{children}</div>;
}

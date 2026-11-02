import type { Metadata } from "next";
import AccountView from "@/features/auth/AccountView";

export const metadata: Metadata = { title: "Mon compte" };

export default function AccountPage() {
  return <AccountView />;
}

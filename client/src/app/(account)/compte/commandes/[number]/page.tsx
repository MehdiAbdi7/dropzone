"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useMyOrderQuery } from "@/features/auth/authApi";
import OrderDetailView from "@/features/orders/OrderDetailView";

export default function MyOrderPage() {
  const { number } = useParams<{ number: string }>();
  const { data, isError } = useMyOrderQuery(Number(number));

  return (
    <div className="space-y-6">
      <Link href="/compte" className="text-sm text-blue-ink underline">
        Mes commandes
      </Link>
      {isError ? (
        <p role="alert">Cette commande est introuvable dans votre compte.</p>
      ) : data ? (
        <OrderDetailView order={data} />
      ) : (
        <p className="text-ink-muted">Chargement…</p>
      )}
    </div>
  );
}

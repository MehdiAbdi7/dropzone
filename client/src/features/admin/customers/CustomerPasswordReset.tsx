"use client";

import { useResetCustomerPasswordMutation } from "@/features/admin/api/customersApi";
import PasswordResetBox from "./PasswordResetBox";

// Un nouveau mot de passe pour un client qui a oublié le sien (15/11). Toute l'interface est dans
// PasswordResetBox, partagée avec la page Comptes ; ici, seulement l'appel qui concerne un client.
export default function CustomerPasswordReset({ customer }: { customer: { id: number; firstName: string; lastName: string } }) {
  const [reset] = useResetCustomerPasswordMutation();
  return (
    <PasswordResetBox
      name={`${customer.firstName} ${customer.lastName}`}
      onSubmit={(newPassword) => reset({ id: customer.id, newPassword }).unwrap()}
    />
  );
}

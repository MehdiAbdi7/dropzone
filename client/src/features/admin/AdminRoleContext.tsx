"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { Role } from "@/types/api";

// Le rôle de celui qui est connecté au back-office (lot 7), lu une fois par le layout du serveur et donné à
// tous les composants du back-office : le menu, les alertes, les liens des pages. Sans fournisseur, le rôle
// vaut « customer », c'est-à-dire aucun droit : en cas d'oubli, on cache plutôt qu'on montre.
// Ce n'est qu'un choix d'affichage : l'API refuse (403) tout ce que le rôle n'a pas, quoi qu'affiche l'écran.
const AdminRoleContext = createContext<Role>("customer");

export function AdminRoleProvider({ role, children }: { role: Role; children: ReactNode }) {
  return <AdminRoleContext.Provider value={role}>{children}</AdminRoleContext.Provider>;
}

export const useAdminRole = () => useContext(AdminRoleContext);

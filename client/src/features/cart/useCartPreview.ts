"use client";

import { useEffect } from "react";
import { useCartPreviewQuery } from "@/features/orders/ordersApi";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import { linesConfirmed, selectCartRequest } from "./cartSlice";

// L'aperçu du panier calculé par le serveur (prix, stock, cadeaux), partagé par la barre, la
// fenêtre et la commande. RTK Query ne fait qu'un appel pour tous : même argument, même cache.
//
// À chaque réponse, les descriptions des lignes sont recopiées dans le panier du navigateur
// (sans les prix), pour que la prochaine visite affiche le panier sans attendre le serveur.
export function useCartPreview({ skip }: { skip: boolean }) {
  const dispatch = useAppDispatch();
  const request = useAppSelector(selectCartRequest);
  const result = useCartPreviewQuery(request, { skip: skip || request.length === 0 });
  const lines = result.data?.lines;

  useEffect(() => {
    if (lines) dispatch(linesConfirmed(lines));
  }, [lines, dispatch]);

  return { ...result, request };
}

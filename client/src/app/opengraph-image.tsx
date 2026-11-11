import { ImageResponse } from "next/og";
import { STORE_INFO } from "@/config/storeInfo";

// L'image de l'aperçu d'un lien partagé (WhatsApp, Instagram, Facebook), pour toutes les
// pages qui n'ont pas la leur. Générée par Next au premier appel, puis gardée en cache.
export const alt = "DropZone (démo) : laptops, smartphones et tablettes sélectionnés d'Europe";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: "linear-gradient(135deg, #000000 0%, #1a0505 60%, #4a0b0b 100%)",
          color: "#ffffff",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ fontSize: 30, fontWeight: 700, letterSpacing: 6, color: "#ef4444" }}>
          SÉLECTIONNÉS D&apos;EUROPE
        </div>
        <div style={{ fontSize: 110, fontWeight: 800, marginTop: 20 }}>{STORE_INFO.name}</div>
        <div style={{ fontSize: 44, marginTop: 16, color: "#e5e5e5" }}>
          Neuf scellé ou en affaire.
        </div>
        <div style={{ fontSize: 30, marginTop: 48, color: "#a3a3a3" }}>
          Livraison dans les 58 wilayas · Paiement à la livraison
        </div>
      </div>
    ),
    size,
  );
}

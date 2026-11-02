// Les frais de livraison : une règle simple, calculée par le serveur seulement.
// Valeurs à ajuster avec DropZone, qui annonce « Free Shipping » sur Instagram.
export const SHIPPING_FEE = 600;
export const FREE_SHIPPING_FROM = 10_000;

export function computeShippingFee(subtotal: number): number {
  if (subtotal === 0 || subtotal >= FREE_SHIPPING_FROM) {
    return 0;
  }
  return SHIPPING_FEE;
}

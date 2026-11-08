import { Suspense, type ReactNode } from "react";
import ShopPageTransition from "@/features/shop/ShopPageTransition";

export default function ShopTemplate({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<div className="shop-page-transition">{children}</div>}>
      <ShopPageTransition>{children}</ShopPageTransition>
    </Suspense>
  );
}

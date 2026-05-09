"use client"

import { ShopProvider } from "@/hooks/use-shop-context"

export function Providers({ children }: { children: React.ReactNode }) {
  return <ShopProvider>{children}</ShopProvider>
}

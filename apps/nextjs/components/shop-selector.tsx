"use client"

import { useShopContext } from "@/hooks/use-shop-context"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export function ShopSelector() {
  const { shops, activeShopId, isLoading, setActiveShopId } = useShopContext()

  return (
    <Select
      value={activeShopId ? String(activeShopId) : undefined}
      onValueChange={(value) => setActiveShopId(Number(value))}
      disabled={isLoading || shops.length === 0}
    >
      <SelectTrigger className="w-full sm:w-60">
        <SelectValue placeholder={isLoading ? "Խանութների բեռնում…" : "Ընտրել խանութը"} />
      </SelectTrigger>
      <SelectContent>
        {shops.map((shop) => (
          <SelectItem key={shop.id} value={String(shop.id)}>
            {shop.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

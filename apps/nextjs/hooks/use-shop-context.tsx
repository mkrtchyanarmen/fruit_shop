"use client"

import { createContext, useContext, useEffect, useMemo, useState } from "react"
import type { Shop } from "@fruit-shop/types"
import { ACTIVE_SHOP_STORAGE_KEY } from "@/lib/constants"
import { getShops } from "@/lib/strapi"

interface ShopContextValue {
  shops: Shop[]
  activeShopId: number | null
  activeShop: Shop | null
  isLoading: boolean
  error: string | null
  setActiveShopId: (shopId: number) => void
  refreshShops: () => Promise<void>
}

const ShopContext = createContext<ShopContextValue | null>(null)

function getStoredShopId() {
  if (typeof window === "undefined") return null
  const raw = window.localStorage.getItem(ACTIVE_SHOP_STORAGE_KEY)
  const parsed = Number(raw)
  return Number.isNaN(parsed) ? null : parsed
}

export function ShopProvider({ children }: { children: React.ReactNode }) {
  const [shops, setShops] = useState<Shop[]>([])
  const [activeShopId, setActiveShopIdState] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const setActiveShopId = (shopId: number) => {
    setActiveShopIdState(shopId)
    window.localStorage.setItem(ACTIVE_SHOP_STORAGE_KEY, String(shopId))
  }

  const refreshShops = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const fetchedShops = await getShops()
      const activeOnly = fetchedShops.filter((shop) => shop.isActive)
      setShops(activeOnly)
      const storedShopId = getStoredShopId()
      const fallbackId = activeOnly[0]?.id ?? null
      const resolvedId = activeOnly.some((shop) => shop.id === storedShopId)
        ? storedShopId
        : fallbackId
      setActiveShopIdState(resolvedId)
      if (resolvedId) {
        window.localStorage.setItem(ACTIVE_SHOP_STORAGE_KEY, String(resolvedId))
      }
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Խանութների ցուցակը բեռնել չհաջողվեց",
      )
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void refreshShops()
  }, [])

  const value = useMemo<ShopContextValue>(
    () => ({
      shops,
      activeShopId,
      activeShop: shops.find((shop) => shop.id === activeShopId) ?? null,
      isLoading,
      error,
      setActiveShopId,
      refreshShops,
    }),
    [shops, activeShopId, isLoading, error],
  )

  return <ShopContext.Provider value={value}>{children}</ShopContext.Provider>
}

export function useShopContext() {
  const value = useContext(ShopContext)
  if (!value) {
    throw new Error("useShopContext must be used inside ShopProvider")
  }
  return value
}

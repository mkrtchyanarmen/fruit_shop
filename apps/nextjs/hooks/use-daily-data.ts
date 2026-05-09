"use client"

import { useCallback, useEffect, useState } from "react"
import type { SaleItem, StockArrival } from "@fruit-shop/types"
import { computeDailySummary } from "@/lib/calculations"
import { getAllStockArrivalsForShop, getSales, getStockArrivals } from "@/lib/strapi"

interface UseDailyDataResult {
  sales: SaleItem[]
  arrivals: StockArrival[]
  allArrivalsForCost: StockArrival[]
  summary: ReturnType<typeof computeDailySummary>
  isLoading: boolean
  error: string | null
  refresh: () => Promise<void>
}

export function useDailyData(date: string, shopId: number | null): UseDailyDataResult {
  const [sales, setSales] = useState<SaleItem[]>([])
  const [arrivals, setArrivals] = useState<StockArrival[]>([])
  const [allArrivalsForCost, setAllArrivalsForCost] = useState<StockArrival[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!shopId) {
      setSales([])
      setArrivals([])
      setAllArrivalsForCost([])
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)
    try {
      const [fetchedSales, fetchedArrivals, fetchedAllArrivals] = await Promise.all([
        getSales(shopId, date),
        getStockArrivals(shopId, date),
        getAllStockArrivalsForShop(shopId),
      ])
      setSales(fetchedSales)
      setArrivals(fetchedArrivals)
      setAllArrivalsForCost(fetchedAllArrivals)
    } catch (requestError) {
      setSales([])
      setArrivals([])
      setAllArrivalsForCost([])
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Օրվա տվյալները բեռնել չհաջողվեց",
      )
    } finally {
      setIsLoading(false)
    }
  }, [date, shopId])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return {
    sales,
    arrivals,
    allArrivalsForCost,
    summary: computeDailySummary(sales, arrivals, allArrivalsForCost),
    isLoading,
    error,
    refresh,
  }
}

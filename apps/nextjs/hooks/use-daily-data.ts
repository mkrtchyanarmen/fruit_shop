"use client"

import { useCallback, useEffect, useState } from "react"
import type { SaleItem, StockArrival } from "@fruit-shop/types"
import { computeDailySummary } from "@/lib/calculations"
import { getSales, getStockArrivals } from "@/lib/strapi"

interface UseDailyDataResult {
  sales: SaleItem[]
  arrivals: StockArrival[]
  summary: ReturnType<typeof computeDailySummary>
  isLoading: boolean
  error: string | null
  refresh: () => Promise<void>
}

export function useDailyData(date: string, shopId: number | null): UseDailyDataResult {
  const [sales, setSales] = useState<SaleItem[]>([])
  const [arrivals, setArrivals] = useState<StockArrival[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!shopId) {
      setSales([])
      setArrivals([])
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)
    try {
      const [fetchedSales, fetchedArrivals] = await Promise.all([
        getSales(shopId, date),
        getStockArrivals(shopId, date),
      ])
      setSales(fetchedSales)
      setArrivals(fetchedArrivals)
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Failed to fetch daily data",
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
    summary: computeDailySummary(sales, arrivals),
    isLoading,
    error,
    refresh,
  }
}

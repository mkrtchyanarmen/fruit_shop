import type { Fruit, SaleItem, Shop, StockArrival } from "@fruit-shop/types"

export interface BreakdownRow {
  fruitId: number
  fruitName: string
  quantity: number
  amount: number
}

export interface DailyComputedSummary {
  totalRevenue: number
  totalStockCost: number
  totalTransportCost: number
  netProfit: number
  soldBreakdown: BreakdownRow[]
  receivedBreakdown: BreakdownRow[]
}

export type { Shop, Fruit, StockArrival, SaleItem }

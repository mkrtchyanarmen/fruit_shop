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
  /** Միջին ինքնարժեքով հաշվարկված վաճառքի ավելացված արժեք (markup), ոչ ամբողջ եկամուտը */
  soldMarkup: number
  /** Նախկին ամփոփիչ՝ օրվա մուտքերի ծախսը և տրանսպորտը հանած */
  netProfit: number
  soldBreakdown: BreakdownRow[]
  receivedBreakdown: BreakdownRow[]
}

export type { Shop, Fruit, StockArrival, SaleItem }

export interface Shop {
  id: number
  name: string
  address?: string
  isActive: boolean
}

export interface Fruit {
  id: number
  name: string
  unit: 'kg' | 'piece' | 'bunch'
  description?: string
  image?: {
    url: string
    alternativeText?: string
  }
}

export interface StockArrival {
  id: number
  date: string
  shop: Shop
  fruit: Fruit
  quantity: number
  unitCost: number
  transportCost: number
}

export interface SaleItem {
  id: number
  date: string
  shop: Shop
  fruit: Fruit
  quantity: number
  pricePerUnit: number
}

export interface DailySummary {
  date: string
  shopId: number
  totalRevenue: number
  totalStockCost: number
  totalTransportCost: number
  netProfit: number
}

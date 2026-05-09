export interface Shop {
  id: number
  /** Strapi 5 REST PUT/DELETE URL-ում պահանջվում է documentId, ոչ թե թվային id */
  documentId?: string
  name: string
  address?: string
  isActive: boolean
}

export interface Fruit {
  id: number
  /** Strapi 5՝ թարմացման REST ուղին `/api/fruits/:documentId` */
  documentId?: string
  name: string
  unit: 'kg' | 'piece' | 'bunch'
  description?: string
  /** Ֆիքսված վաճառքի գին դրամով / միավոր (AMD). Թողնել դատարկ՝ լռելյայն տոկոսային առաջարկ։ Markup-ը հաշվարկվում է կոդում։ */
  retailPricePerUnit?: number | null
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

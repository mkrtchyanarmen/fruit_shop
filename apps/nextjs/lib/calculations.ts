import type { SaleItem, StockArrival } from "@fruit-shop/types"
import type { BreakdownRow, DailyComputedSummary } from "@/lib/types"

function toSortedRows(map: Map<number, BreakdownRow>) {
  return Array.from(map.values()).sort((a, b) => b.amount - a.amount)
}

export function computeDailySummary(
  sales: SaleItem[],
  arrivals: StockArrival[],
): DailyComputedSummary {
  const totalRevenue = sales.reduce(
    (sum, item) => sum + item.quantity * item.pricePerUnit,
    0,
  )
  const totalStockCost = arrivals.reduce(
    (sum, item) => sum + item.quantity * item.unitCost,
    0,
  )
  const totalTransportCost = arrivals.reduce(
    (sum, item) => sum + item.transportCost,
    0,
  )

  const soldMap = new Map<number, BreakdownRow>()
  for (const sale of sales) {
    const current = soldMap.get(sale.fruit.id)
    const amount = sale.quantity * sale.pricePerUnit
    soldMap.set(sale.fruit.id, {
      fruitId: sale.fruit.id,
      fruitName: sale.fruit.name,
      quantity: (current?.quantity ?? 0) + sale.quantity,
      amount: (current?.amount ?? 0) + amount,
    })
  }

  const receivedMap = new Map<number, BreakdownRow>()
  for (const arrival of arrivals) {
    const current = receivedMap.get(arrival.fruit.id)
    const amount = arrival.quantity * arrival.unitCost
    receivedMap.set(arrival.fruit.id, {
      fruitId: arrival.fruit.id,
      fruitName: arrival.fruit.name,
      quantity: (current?.quantity ?? 0) + arrival.quantity,
      amount: (current?.amount ?? 0) + amount,
    })
  }

  return {
    totalRevenue,
    totalStockCost,
    totalTransportCost,
    netProfit: totalRevenue - totalStockCost - totalTransportCost,
    soldBreakdown: toSortedRows(soldMap),
    receivedBreakdown: toSortedRows(receivedMap),
  }
}

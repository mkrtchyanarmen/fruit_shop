import type { Fruit, SaleItem, StockArrival } from "@fruit-shop/types"

export interface FruitInventoryRow {
  fruit: Fruit
  quantityReceived: number
  quantitySold: number
  quantityOnHand: number
  /** Weighted average unit cost from all arrivals (qty-weighted). Undefined if no arrivals. */
  weightedAverageUnitCost?: number
}

/**
 * Weighted average purchase cost per fruit from stock arrivals.
 */
export function weightedAverageUnitCostByFruit(arrivals: StockArrival[]) {
  const numer = new Map<number, number>()
  const denom = new Map<number, number>()
  const fruitById = new Map<number, Fruit>()

  for (const a of arrivals) {
    const id = a.fruit.id
    fruitById.set(id, a.fruit)
    numer.set(id, (numer.get(id) ?? 0) + a.quantity * a.unitCost)
    denom.set(id, (denom.get(id) ?? 0) + a.quantity)
  }

  const avg = new Map<number, number>()
  for (const [id, sumQtyCost] of numer) {
    const q = denom.get(id) ?? 0
    if (q > 0) avg.set(id, sumQtyCost / q)
  }
  return { averages: avg, fruitById }
}

export function computeFruitInventoryRows(
  arrivals: StockArrival[],
  sales: SaleItem[],
): FruitInventoryRow[] {
  const received = new Map<number, number>()
  const sold = new Map<number, number>()
  const fruitById = new Map<number, Fruit>()

  for (const a of arrivals) {
    const id = a.fruit.id
    fruitById.set(id, a.fruit)
    received.set(id, (received.get(id) ?? 0) + a.quantity)
  }
  for (const s of sales) {
    const id = s.fruit.id
    fruitById.set(id, s.fruit)
    sold.set(id, (sold.get(id) ?? 0) + s.quantity)
  }

  const { averages } = weightedAverageUnitCostByFruit(arrivals)

  const ids = new Set<number>([...received.keys(), ...sold.keys()])
  const rows: FruitInventoryRow[] = []
  for (const id of ids) {
    const fruit = fruitById.get(id)
    if (!fruit) continue
    const qtyIn = received.get(id) ?? 0
    const qtyOut = sold.get(id) ?? 0
    const avgCost = averages.get(id)
    rows.push({
      fruit,
      quantityReceived: qtyIn,
      quantitySold: qtyOut,
      quantityOnHand: qtyIn - qtyOut,
      weightedAverageUnitCost: avgCost,
    })
  }

  rows.sort((a, b) => a.fruit.name.localeCompare(b.fruit.name))
  return rows
}

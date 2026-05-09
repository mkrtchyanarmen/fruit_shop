/** Retail markup over landed unit cost (30%–40%). */
export const MARKUP_MIN = 0.3
export const MARKUP_MAX = 0.4

function roundCurrency(value: number) {
  return Math.round(value * 100) / 100
}

export function retailPriceRangeFromUnitCost(unitCost: number) {
  if (!Number.isFinite(unitCost) || unitCost <= 0) return null
  return {
    min: roundCurrency(unitCost * (1 + MARKUP_MIN)),
    max: roundCurrency(unitCost * (1 + MARKUP_MAX)),
    /** Midpoint markup (35%). */
    suggested: roundCurrency(unitCost * (1 + (MARKUP_MIN + MARKUP_MAX) / 2)),
  }
}

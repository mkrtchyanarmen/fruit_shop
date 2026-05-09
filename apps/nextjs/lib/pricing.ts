/** Retail markup over landed unit cost when no fixed price is set (30%–40%). */
export const MARKUP_MIN = 0.3
export const MARKUP_MAX = 0.4

function roundCurrency(value: number) {
  return Math.round(value * 100) / 100
}

export interface RetailPriceRange {
  min: number
  max: number
  suggested: number
}

/**
 * Առաջարկվող վաճառքի միջակայք։
 * @param retailPricePerUnit Եթե տրված է (դրամ/միավոր)՝ օգտագործվում է որպես ֆիքսված վաճառքի գին (API/Next հաշվարկում է markup-ը)։
 * Եթե չկա՝ լռելյայն տոկոսային միջակայք ինքնարժեքից։
 */
export function retailPriceRangeFromUnitCost(
  unitCost: number,
  retailPricePerUnit?: number | null,
): RetailPriceRange | null {
  if (!Number.isFinite(unitCost) || unitCost <= 0) return null

  const fixed =
    retailPricePerUnit !== undefined &&
    retailPricePerUnit !== null &&
    Number.isFinite(Number(retailPricePerUnit)) &&
    Number(retailPricePerUnit) > 0

  if (fixed) {
    const p = roundCurrency(Number(retailPricePerUnit))
    return { min: p, max: p, suggested: p }
  }

  return {
    min: roundCurrency(unitCost * (1 + MARKUP_MIN)),
    max: roundCurrency(unitCost * (1 + MARKUP_MAX)),
    suggested: roundCurrency(unitCost * (1 + (MARKUP_MIN + MARKUP_MAX) / 2)),
  }
}

/** Մեկ միավորի վրա markup AMD (առաջարկված վաճառք − ինքնարժեք)։ */
export function markupAmountPerUnit(
  unitCost: number,
  retailPricePerUnit?: number | null,
): number | null {
  const range = retailPriceRangeFromUnitCost(unitCost, retailPricePerUnit)
  if (!range) return null
  return roundCurrency(range.suggested - unitCost)
}

/** Միջին ինքնարժեքից վերևի տոկոսը՝ ցուցադրման համար (ավտոմատ հաշվարկ)։ */
export function impliedMarkupPercentDisplay(
  unitCost: number,
  retailPricePerUnit: number,
): string | null {
  if (!Number.isFinite(unitCost) || unitCost <= 0) return null
  if (!Number.isFinite(retailPricePerUnit) || retailPricePerUnit <= 0) return null
  const pct = ((retailPricePerUnit - unitCost) / unitCost) * 100
  if (!Number.isFinite(pct)) return null
  return `${pct >= 0 ? "" : "−"}${Math.abs(pct).toFixed(1)}%`
}

import type { Fruit } from "@fruit-shop/types"

const currencyFormatter = new Intl.NumberFormat("hy-AM", {
  style: "currency",
  currency: "AMD",
  maximumFractionDigits: 0,
})

export function formatCurrency(value: number) {
  return currencyFormatter.format(value)
}

export function formatNumber(value: number) {
  if (Number.isInteger(value)) {
    return new Intl.NumberFormat("hy-AM", { maximumFractionDigits: 0 }).format(value)
  }
  return new Intl.NumberFormat("hy-AM", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

const unitLabels: Record<Fruit["unit"], string> = {
  kg: "կգ",
  piece: "հատ",
  bunch: "փունջ",
}

export function formatFruitUnit(unit: Fruit["unit"]) {
  return unitLabels[unit] ?? unit
}

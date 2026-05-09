import type { Fruit } from "@fruit-shop/types"

/** Quick-pick quantities by how the product is sold */
export function quantityPresetsForUnit(unit: Fruit["unit"]): number[] {
  switch (unit) {
    case "kg":
      return [0.25, 0.5, 1, 1.5, 2, 3, 5]
    case "piece":
      return [1, 2, 3, 5, 10]
    case "bunch":
      return [1, 2, 3, 5]
    default:
      return [1]
  }
}

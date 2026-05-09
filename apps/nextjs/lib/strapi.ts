import type { Fruit, SaleItem, Shop, StockArrival } from "@fruit-shop/types"
import { STRAPI_BASE_URL } from "@/lib/constants"

type StrapiEntity<T> = {
  id: number
  attributes: T
}

type StrapiResponse<T> = {
  data: Array<StrapiEntity<T>>
}

type Relation<T> = {
  data: StrapiEntity<T> | null
}

type MediaRelation = {
  data: StrapiEntity<{
    url: string
    alternativeText?: string | null
  }> | null
}

interface ShopAttributes {
  name: string
  address?: string
  isActive?: boolean
  is_active?: boolean
}

interface FruitAttributes {
  name: string
  unit: "kg" | "piece" | "bunch"
  description?: string
  image?: MediaRelation
}

interface StockArrivalAttributes {
  date: string
  quantity: number
  unitCost?: number
  unit_cost?: number
  transportCost?: number
  transport_cost?: number
  shop: Relation<ShopAttributes>
  fruit: Relation<FruitAttributes>
}

interface SaleItemAttributes {
  date: string
  quantity: number
  pricePerUnit?: number
  price_per_unit?: number
  shop: Relation<ShopAttributes>
  fruit: Relation<FruitAttributes>
}

type QueryValue = string | number | boolean | undefined | null

interface RequestOptions {
  query?: Record<string, QueryValue>
  method?: "GET" | "POST" | "PUT"
  body?: unknown
}

function buildQuery(query: Record<string, QueryValue> = {}) {
  const params = new URLSearchParams()
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      params.append(key, String(value))
    }
  })
  return params.toString()
}

async function strapiFetch<T>(path: string, options: RequestOptions = {}) {
  const queryString = buildQuery(options.query)
  const url = `${STRAPI_BASE_URL}${path}${queryString ? `?${queryString}` : ""}`
  const response = await fetch(url, {
    method: options.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
    cache: "no-store",
  })

  if (!response.ok) {
    const message = await response.text()
    throw new Error(`Strapi request failed (${response.status}): ${message}`)
  }

  return (await response.json()) as T
}

function mapShop(entity: StrapiEntity<ShopAttributes>): Shop {
  return {
    id: entity.id,
    name: entity.attributes.name,
    address: entity.attributes.address,
    isActive:
      entity.attributes.isActive ?? entity.attributes.is_active ?? true,
  }
}

function mapFruit(entity: StrapiEntity<FruitAttributes>): Fruit {
  return {
    id: entity.id,
    name: entity.attributes.name,
    unit: entity.attributes.unit,
    description: entity.attributes.description,
    image: entity.attributes.image?.data?.attributes?.url
      ? {
          url: entity.attributes.image.data.attributes.url,
          alternativeText:
            entity.attributes.image.data.attributes.alternativeText ?? undefined,
        }
      : undefined,
  }
}

function requireRelation<T>(relation: Relation<T> | undefined, name: string) {
  if (!relation?.data) {
    throw new Error(`Missing ${name} relation in Strapi response`)
  }
  return relation.data
}

function mapStockArrival(entity: StrapiEntity<StockArrivalAttributes>): StockArrival {
  const shopEntity = requireRelation(entity.attributes.shop, "shop")
  const fruitEntity = requireRelation(entity.attributes.fruit, "fruit")
  return {
    id: entity.id,
    date: entity.attributes.date,
    shop: mapShop(shopEntity),
    fruit: mapFruit(fruitEntity),
    quantity: Number(entity.attributes.quantity),
    unitCost: Number(entity.attributes.unitCost ?? entity.attributes.unit_cost ?? 0),
    transportCost: Number(
      entity.attributes.transportCost ?? entity.attributes.transport_cost ?? 0,
    ),
  }
}

function mapSaleItem(entity: StrapiEntity<SaleItemAttributes>): SaleItem {
  const shopEntity = requireRelation(entity.attributes.shop, "shop")
  const fruitEntity = requireRelation(entity.attributes.fruit, "fruit")
  return {
    id: entity.id,
    date: entity.attributes.date,
    shop: mapShop(shopEntity),
    fruit: mapFruit(fruitEntity),
    quantity: Number(entity.attributes.quantity),
    pricePerUnit: Number(
      entity.attributes.pricePerUnit ?? entity.attributes.price_per_unit ?? 0,
    ),
  }
}

export async function getShops() {
  const response = await strapiFetch<StrapiResponse<ShopAttributes>>("/api/shops", {
    query: { populate: "*" },
  })
  return response.data.map(mapShop)
}

export async function getFruits() {
  const response = await strapiFetch<StrapiResponse<FruitAttributes>>("/api/fruits", {
    query: { populate: "*" },
  })
  return response.data.map(mapFruit)
}

export async function getStockArrivals(shopId: number, date: string) {
  const response = await strapiFetch<StrapiResponse<StockArrivalAttributes>>(
    "/api/stock-arrivals",
    {
      query: {
        populate: "*",
        "filters[shop][id][$eq]": shopId,
        "filters[date][$eq]": date,
      },
    },
  )
  return response.data.map(mapStockArrival)
}

export async function getSales(shopId: number, date: string) {
  const response = await strapiFetch<StrapiResponse<SaleItemAttributes>>(
    "/api/sale-items",
    {
      query: {
        populate: "*",
        "filters[shop][id][$eq]": shopId,
        "filters[date][$eq]": date,
      },
    },
  )
  return response.data.map(mapSaleItem)
}

interface StockArrivalPayload {
  date: string
  fruitId: number
  shopId: number
  quantity: number
  unitCost: number
  transportCost: number
}

export async function createStockArrival(payload: StockArrivalPayload) {
  await strapiFetch("/api/stock-arrivals", {
    method: "POST",
    body: {
      data: {
        date: payload.date,
        quantity: payload.quantity,
        unitCost: payload.unitCost,
        transportCost: payload.transportCost,
        fruit: payload.fruitId,
        shop: payload.shopId,
      },
    },
  })
}

interface SaleItemPayload {
  date: string
  fruitId: number
  shopId: number
  quantity: number
  pricePerUnit: number
}

export async function createSaleItem(payload: SaleItemPayload) {
  await strapiFetch("/api/sale-items", {
    method: "POST",
    body: {
      data: {
        date: payload.date,
        quantity: payload.quantity,
        pricePerUnit: payload.pricePerUnit,
        fruit: payload.fruitId,
        shop: payload.shopId,
      },
    },
  })
}

export async function createShop(payload: { name: string; address: string }) {
  await strapiFetch("/api/shops", {
    method: "POST",
    body: {
      data: {
        name: payload.name,
        address: payload.address,
        isActive: true,
      },
    },
  })
}

export async function updateShop(
  shopId: number,
  payload: { name?: string; address?: string; isActive?: boolean },
) {
  await strapiFetch(`/api/shops/${shopId}`, {
    method: "PUT",
    body: {
      data: payload,
    },
  })
}

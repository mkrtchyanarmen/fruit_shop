import type { Fruit, SaleItem, Shop, StockArrival } from "@fruit-shop/types"
import { STRAPI_BASE_URL } from "@/lib/constants"

/** Strapi v4: { id, attributes: { ... } }. Strapi v5: fields at top level with optional documentId. */
type ApiEntity = Record<string, unknown> & {
  id?: number
  documentId?: string
  attributes?: Record<string, unknown>
}

type StrapiListResponse = {
  data: ApiEntity[]
  meta?: {
    pagination?: {
      page: number
      pageSize: number
      pageCount: number
      total: number
    }
  }
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
    throw new Error(`Սերվերի հարցումը չհաջողվեց (${response.status}): ${message}`)
  }

  return (await response.json()) as T
}

/** Merge v4 `attributes` with top-level system fields; Strapi v5 is already flat. */
function flattenEntity(entity: ApiEntity): Record<string, unknown> {
  const { attributes, ...rest } = entity
  const base = { ...rest } as Record<string, unknown>
  if (attributes && typeof attributes === "object" && !Array.isArray(attributes)) {
    return { ...base, ...attributes }
  }
  return base
}

function resolveNumericId(entity: ApiEntity): number {
  const raw = entity.id
  if (typeof raw === "number" && Number.isFinite(raw)) return raw
  if (typeof raw === "string" && /^\d+$/.test(raw)) return Number(raw)
  throw new Error(
    "Strapi entity missing numeric id. If you use documentId-only responses, enable Strapi-Response-Format v4 or extend the mapper.",
  )
}

/** v4: { data: { id, attributes } }. v5: populated relation is the document object itself. */
function resolveRelationTarget(relation: unknown): ApiEntity | null {
  if (relation === null || relation === undefined) return null
  if (typeof relation !== "object") return null
  const obj = relation as Record<string, unknown>
  if ("data" in obj) {
    const data = obj.data
    if (data === null || data === undefined) return null
    if (Array.isArray(data)) {
      const first = data[0]
      return first && typeof first === "object" ? (first as ApiEntity) : null
    }
    return data as ApiEntity
  }
  return relation as ApiEntity
}

/** v4 media: image.data.attributes.url. v5: often flat url on the media object. */
function mapImage(media: unknown): Fruit["image"] {
  if (media === null || media === undefined) return undefined
  if (typeof media !== "object") return undefined
  const obj = media as Record<string, unknown>

  const directUrl = obj.url
  if (typeof directUrl === "string") {
    return {
      url: directUrl,
      alternativeText:
        typeof obj.alternativeText === "string" ? obj.alternativeText : undefined,
    }
  }

  const data = obj.data
  if (data && typeof data === "object" && !Array.isArray(data)) {
    const inner = data as Record<string, unknown>
    const attrs = inner.attributes
    const source =
      attrs && typeof attrs === "object" && !Array.isArray(attrs)
        ? (attrs as Record<string, unknown>)
        : inner
    const url = source.url
    if (typeof url === "string") {
      return {
        url,
        alternativeText:
          typeof source.alternativeText === "string"
            ? source.alternativeText
            : undefined,
      }
    }
  }

  return undefined
}

function pickBoolean(
  fields: Record<string, unknown>,
  keys: string[],
  fallback: boolean,
): boolean {
  for (const key of keys) {
    const v = fields[key]
    if (typeof v === "boolean") return v
  }
  return fallback
}

function resolveDocumentId(entity: ApiEntity, fields: Record<string, unknown>): string | undefined {
  const raw =
    fields.documentId ??
    fields.document_id ??
    entity.documentId ??
    (entity as Record<string, unknown>).document_id
  return typeof raw === "string" && raw.length > 0 ? raw : undefined
}

function mapShop(entity: ApiEntity): Shop {
  const id = resolveNumericId(entity)
  const fields = flattenEntity(entity)
  return {
    id,
    documentId: resolveDocumentId(entity, fields),
    name: String(fields.name ?? ""),
    address: fields.address !== undefined ? String(fields.address) : undefined,
    isActive: pickBoolean(fields, ["isActive", "is_active"], true),
  }
}

function mapFruit(entity: ApiEntity): Fruit {
  const id = resolveNumericId(entity)
  const fields = flattenEntity(entity)
  const unitRaw = fields.unit
  const unit: Fruit["unit"] =
    unitRaw === "kg" || unitRaw === "piece" || unitRaw === "bunch" ? unitRaw : "kg"

  const priceRaw = fields.retailPricePerUnit ?? fields.retail_price_per_unit
  let retailPricePerUnit: number | null | undefined
  if (priceRaw === undefined || priceRaw === null || priceRaw === "") {
    retailPricePerUnit = undefined
  } else {
    const n = Number(priceRaw)
    retailPricePerUnit = Number.isFinite(n) ? n : undefined
  }

  return {
    id,
    documentId: resolveDocumentId(entity, fields),
    name: String(fields.name ?? ""),
    unit,
    description:
      fields.description !== undefined ? String(fields.description) : undefined,
    retailPricePerUnit,
    image: mapImage(fields.image),
  }
}

function requireRelation(relation: unknown, name: string): ApiEntity {
  const target = resolveRelationTarget(relation)
  if (!target) {
    throw new Error(`Missing ${name} relation in Strapi response`)
  }
  return target
}

function mapStockArrival(entity: ApiEntity): StockArrival {
  const fields = flattenEntity(entity)
  const shopEntity = requireRelation(fields.shop, "shop")
  const fruitEntity = requireRelation(fields.fruit, "fruit")

  const unitCost = Number(
    fields.unitCost ?? fields.unit_cost ?? 0,
  )
  const transportCost = Number(
    fields.transportCost ?? fields.transport_cost ?? 0,
  )

  return {
    id: resolveNumericId(entity),
    date: String(fields.date ?? ""),
    shop: mapShop(shopEntity),
    fruit: mapFruit(fruitEntity),
    quantity: Number(fields.quantity ?? 0),
    unitCost,
    transportCost,
  }
}

function mapSaleItem(entity: ApiEntity): SaleItem {
  const fields = flattenEntity(entity)
  const shopEntity = requireRelation(fields.shop, "shop")
  const fruitEntity = requireRelation(fields.fruit, "fruit")

  return {
    id: resolveNumericId(entity),
    date: String(fields.date ?? ""),
    shop: mapShop(shopEntity),
    fruit: mapFruit(fruitEntity),
    quantity: Number(fields.quantity ?? 0),
    pricePerUnit: Number(
      fields.pricePerUnit ?? fields.price_per_unit ?? 0,
    ),
  }
}

export async function getShops() {
  const response = await strapiFetch<StrapiListResponse>("/api/shops", {
    query: { populate: "*" },
  })
  return response.data.map(mapShop)
}

export async function getFruits() {
  const response = await strapiFetch<StrapiListResponse>("/api/fruits", {
    query: { populate: "*" },
  })
  return response.data.map(mapFruit)
}

/** Strapi 5՝ թարմացումը կատարվում է documentId-ով, ոչ թե թվային id-ով */
export async function updateFruit(
  documentId: string,
  payload: { retailPricePerUnit?: number | null },
) {
  await strapiFetch(`/api/fruits/${encodeURIComponent(documentId)}`, {
    method: "PUT",
    body: {
      data: {
        ...(payload.retailPricePerUnit !== undefined
          ? { retailPricePerUnit: payload.retailPricePerUnit }
          : {}),
      },
    },
  })
}

async function fetchAllPaginated(path: string, baseQuery: Record<string, QueryValue>) {
  const pageSize = 100 // must match apps/strapi config api.rest.maxLimit
  let page = 1
  const all: ApiEntity[] = []

  while (true) {
    const response = await strapiFetch<StrapiListResponse>(path, {
      query: {
        ...baseQuery,
        "pagination[page]": page,
        "pagination[pageSize]": pageSize,
      },
    })
    const chunk = response.data
    all.push(...chunk)

    const pagination = response.meta?.pagination
    if (pagination) {
      if (page >= pagination.pageCount) break
      page += 1
      continue
    }
    if (chunk.length < pageSize) break
    page += 1
  }

  return all
}

export async function getStockArrivals(shopId: number, date: string) {
  const response = await strapiFetch<StrapiListResponse>("/api/stock-arrivals", {
    query: {
      populate: "*",
      "filters[shop][id][$eq]": shopId,
      "filters[date][$eq]": date,
    },
  })
  return response.data.map(mapStockArrival)
}

/** All arrivals for the shop (all dates), for inventory and landed cost. */
export async function getAllStockArrivalsForShop(shopId: number) {
  const data = await fetchAllPaginated("/api/stock-arrivals", {
    populate: "*",
    "filters[shop][id][$eq]": shopId,
  })
  return data.map(mapStockArrival)
}

export async function getSales(shopId: number, date: string) {
  const response = await strapiFetch<StrapiListResponse>("/api/sale-items", {
    query: {
      populate: "*",
      "filters[shop][id][$eq]": shopId,
      "filters[date][$eq]": date,
    },
  })
  return response.data.map(mapSaleItem)
}

/** All recorded sales for the shop (all dates). */
export async function getAllSalesForShop(shopId: number) {
  const data = await fetchAllPaginated("/api/sale-items", {
    populate: "*",
    "filters[shop][id][$eq]": shopId,
  })
  return data.map(mapSaleItem)
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

export interface BulkStockLinePayload {
  fruitId: number
  quantity: number
  unitCost: number
}

/** Մեկ ամսաթվի և խանութի համար՝ տրանսպորտը բաշխվում է տողերի վրա սերվերի կողմից։ */
export async function createStockArrivalsBulk(payload: {
  date: string
  shopId: number
  totalTransportCost: number
  items: BulkStockLinePayload[]
}) {
  await strapiFetch("/api/stock-arrivals/bulk", {
    method: "POST",
    body: {
      data: {
        date: payload.date,
        shop: payload.shopId,
        totalTransportCost: payload.totalTransportCost,
        items: payload.items.map((item) => ({
          fruitId: item.fruitId,
          quantity: item.quantity,
          unitCost: item.unitCost,
        })),
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

export interface BulkSaleLinePayload {
  fruitId: number
  quantity: number
  pricePerUnit: number
}

export async function createSaleItemsBulk(payload: {
  date: string
  shopId: number
  items: BulkSaleLinePayload[]
}) {
  await strapiFetch("/api/sale-items/bulk", {
    method: "POST",
    body: {
      data: {
        date: payload.date,
        shop: payload.shopId,
        items: payload.items.map((item) => ({
          fruitId: item.fruitId,
          quantity: item.quantity,
          pricePerUnit: item.pricePerUnit,
        })),
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
  documentId: string,
  payload: { name?: string; address?: string; isActive?: boolean },
) {
  await strapiFetch(`/api/shops/${encodeURIComponent(documentId)}`, {
    method: "PUT",
    body: {
      data: payload,
    },
  })
}

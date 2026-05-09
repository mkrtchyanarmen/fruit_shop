/** Must match Strapi `PORT` (see apps/strapi/.env). Override for local dev if 1337 is taken. */
export const STRAPI_BASE_URL =
  process.env.NEXT_PUBLIC_STRAPI_URL ?? "http://localhost:1337"
export const ACTIVE_SHOP_STORAGE_KEY = "fruit-shop-active-shop-id"

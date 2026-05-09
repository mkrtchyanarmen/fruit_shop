#!/usr/bin/env node
/**
 * Seeds the Strapi database with realistic mock data for the fruit shop.
 *
 * Hits the public REST API at $STRAPI_URL (default http://localhost:1337) so
 * it doubles as an end-to-end smoke test of the public endpoints.
 *
 * Usage (run after `pnpm dev:strapi` is up in another terminal):
 *   pnpm --filter strapi seed         # only seeds when DB is empty
 *   pnpm --filter strapi seed:reset   # wipes everything first, then reseeds
 *
 * Money values are in AMD (Armenian dram) to match the shop addresses.
 */

const BASE = process.env.STRAPI_URL ?? 'http://localhost:1337';
const RESET = process.argv.includes('--reset');

/** @type {(method: string, path: string, body?: unknown) => Promise<any>} */
async function api(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`${method} ${path} → ${res.status} ${res.statusText}\n${text}`);
  }
  if (res.status === 204) return null;
  const ct = res.headers.get('content-type') ?? '';
  return ct.includes('application/json') ? res.json() : null;
}

async function waitForStrapi() {
  process.stdout.write(`Սպասում ենք Strapi-ին (${BASE}) `);
  for (let i = 0; i < 30; i++) {
    try {
      await api('GET', '/api/shops?pagination[pageSize]=1');
      process.stdout.write(' պատրաստ է։\n');
      return;
    } catch {
      process.stdout.write('.');
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
  throw new Error(
    `\nStrapi-ին հնարավոր չի կապվել ${BASE} հասցով։ Միացրեք՝ pnpm dev:strapi`,
  );
}

async function deleteAll(plural) {
  // Pull pages until empty so we don't get tripped up by pagination.
  while (true) {
    const { data } = await api(
      'GET',
      `/api/${plural}?pagination[pageSize]=100&fields[0]=id`,
    );
    if (!data.length) return;
    for (const item of data) {
      await api('DELETE', `/api/${plural}/${item.documentId}`);
    }
  }
}

function isoDaysAgo(days) {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

/** Մեկ խանութ — ընտրիչը UI-ում թաքցված է մինչև երկրորդ խանութ ավելացնեն։ */
const SHOP_NAME = 'Մրգերի խանութ';

const SHOP_DEFS = [
  { name: SHOP_NAME, address: 'Տիգրան Մեծ 5, Երևան', isActive: true },
];

const FRUIT_DEFS = [
  { name: 'Խնձոր', unit: 'kg', description: 'Կծկուն կարմիր խնձոր՝ Արագածոտնից։' },
  { name: 'Բանան', unit: 'kg', description: 'Էկվադորից ներմուծում, հասունացված խանութում։' },
  { name: 'Նուռ', unit: 'piece', description: 'Քաղցր տեղական նուռ՝ Մեղրիից։' },
  { name: 'Խաղող', unit: 'bunch', description: 'Արենիի մութ խաղող՝ փունջով։' },
  { name: 'Ելակ', unit: 'kg', description: 'Ջերմոցային, քաշով վաճառք։' },
  { name: 'Ձմերուկ', unit: 'piece', description: 'Սեզոնային՝ Արարատյան դաշտից։' },
  { name: 'Լոլիկ', unit: 'kg', description: 'Տեղական լոլիկ, քաշով վաճառք։' },
  { name: 'Վարագույն պղպեղ', unit: 'kg', description: 'Սեղանի վարագույն պղպեղ։' },
  { name: 'Կազմարինի կաղամբ', unit: 'piece', description: 'Սպիտակ կազմարինի կաղամբ՝ հատով։' },
];

// cost in AMD per unit, sale price in AMD per unit
const PRICING = {
  Խնձոր: { unitCost: 800, pricePerUnit: 1200 },
  Բանան: { unitCost: 500, pricePerUnit: 850 },
  Նուռ: { unitCost: 300, pricePerUnit: 500 },
  Խաղող: { unitCost: 1000, pricePerUnit: 1600 },
  Ելակ: { unitCost: 1500, pricePerUnit: 2500 },
  Ձմերուկ: { unitCost: 600, pricePerUnit: 1100 },
  Լոլիկ: { unitCost: 400, pricePerUnit: 650 },
  'Վարագույն պղպեղ': { unitCost: 700, pricePerUnit: 1100 },
  'Կազմարինի կաղամբ': { unitCost: 250, pricePerUnit: 400 },
};

/**
 * Hand-crafted arrivals over the past week. Mix of restock days, multiple
 * shops getting deliveries, etc. Transport cost is per-delivery (flat).
 */
const STOCK_ARRIVALS = [
  // 6 days ago — opening restock across the chain
  { daysAgo: 6, shop: SHOP_NAME, fruit: 'Խնձոր',       quantity: 50, transportCost: 3000 },
  { daysAgo: 6, shop: SHOP_NAME, fruit: 'Բանան',      quantity: 40, transportCost: 2500 },
  { daysAgo: 6, shop: SHOP_NAME, fruit: 'Ելակ',  quantity: 15, transportCost: 4000 },
  { daysAgo: 6, shop: SHOP_NAME, fruit: 'Խնձոր',       quantity: 30, transportCost: 5000 },
  { daysAgo: 6, shop: SHOP_NAME, fruit: 'Նուռ', quantity: 80, transportCost: 4500 },
  { daysAgo: 6, shop: SHOP_NAME,    fruit: 'Խնձոր',       quantity: 25, transportCost: 6000 },
  { daysAgo: 6, shop: SHOP_NAME,    fruit: 'Ձմերուկ',  quantity: 20, transportCost: 7000 },

  // 4 days ago — mid-week top-up
  { daysAgo: 4, shop: SHOP_NAME, fruit: 'Խաղող',       quantity: 30, transportCost: 3500 },
  { daysAgo: 4, shop: SHOP_NAME, fruit: 'Նուռ', quantity: 60, transportCost: 2500 },
  { daysAgo: 4, shop: SHOP_NAME, fruit: 'Բանան',      quantity: 25, transportCost: 5000 },
  { daysAgo: 4, shop: SHOP_NAME,    fruit: 'Ելակ',  quantity: 10, transportCost: 6500 },

  // 2 days ago — weekend prep
  { daysAgo: 2, shop: SHOP_NAME, fruit: 'Ձմերուկ',  quantity: 15, transportCost: 3000 },
  { daysAgo: 2, shop: SHOP_NAME, fruit: 'Խնձոր',       quantity: 35, transportCost: 3000 },
  { daysAgo: 2, shop: SHOP_NAME, fruit: 'Խաղող',       quantity: 20, transportCost: 5000 },
  { daysAgo: 2, shop: SHOP_NAME,    fruit: 'Բանան',      quantity: 30, transportCost: 6000 },
  { daysAgo: 2, shop: SHOP_NAME,    fruit: 'Նուռ', quantity: 50, transportCost: 6000 },

  // today — fresh delivery
  { daysAgo: 0, shop: SHOP_NAME, fruit: 'Ելակ', quantity: 20, transportCost: 4000 },
  { daysAgo: 0, shop: SHOP_NAME, fruit: 'Ձմերուկ', quantity: 12, transportCost: 5500 },
  { daysAgo: 1, shop: SHOP_NAME, fruit: 'Լոլիկ', quantity: 45, transportCost: 2200 },
  { daysAgo: 2, shop: SHOP_NAME, fruit: 'Վարագույն պղպեղ', quantity: 28, transportCost: 1800 },
  { daysAgo: 4, shop: SHOP_NAME, fruit: 'Կազմարինի կաղամբ', quantity: 35, transportCost: 1400 },
];

/**
 * Hand-crafted sales over the past week. Distributed across days/shops/fruits
 * to give realistic daily summary numbers.
 */
const SALE_ITEMS = [
  // 6 days ago
  { daysAgo: 6, shop: SHOP_NAME, fruit: 'Խնձոր',       quantity: 8 },
  { daysAgo: 6, shop: SHOP_NAME, fruit: 'Բանան',      quantity: 6 },
  { daysAgo: 6, shop: SHOP_NAME, fruit: 'Ելակ',  quantity: 3 },
  { daysAgo: 6, shop: SHOP_NAME, fruit: 'Խնձոր',       quantity: 5 },
  { daysAgo: 6, shop: SHOP_NAME, fruit: 'Նուռ', quantity: 12 },
  { daysAgo: 6, shop: SHOP_NAME,    fruit: 'Խնձոր',       quantity: 4 },

  // 5 days ago
  { daysAgo: 5, shop: SHOP_NAME, fruit: 'Խնձոր',       quantity: 10 },
  { daysAgo: 5, shop: SHOP_NAME, fruit: 'Բանան',      quantity: 8 },
  { daysAgo: 5, shop: SHOP_NAME, fruit: 'Նուռ', quantity: 6 },
  { daysAgo: 5, shop: SHOP_NAME, fruit: 'Նուռ', quantity: 10 },
  { daysAgo: 5, shop: SHOP_NAME, fruit: 'Խնձոր',       quantity: 4 },
  { daysAgo: 5, shop: SHOP_NAME,    fruit: 'Ձմերուկ',  quantity: 3 },
  { daysAgo: 5, shop: SHOP_NAME,    fruit: 'Խնձոր',       quantity: 5 },

  // 4 days ago
  { daysAgo: 4, shop: SHOP_NAME, fruit: 'Խաղող',       quantity: 7 },
  { daysAgo: 4, shop: SHOP_NAME, fruit: 'Խնձոր',       quantity: 9 },
  { daysAgo: 4, shop: SHOP_NAME, fruit: 'Ելակ',  quantity: 2 },
  { daysAgo: 4, shop: SHOP_NAME, fruit: 'Բանան',      quantity: 6 },
  { daysAgo: 4, shop: SHOP_NAME,    fruit: 'Ելակ',  quantity: 2 },
  { daysAgo: 4, shop: SHOP_NAME,    fruit: 'Ձմերուկ',  quantity: 4 },

  // 3 days ago
  { daysAgo: 3, shop: SHOP_NAME, fruit: 'Խնձոր',       quantity: 12 },
  { daysAgo: 3, shop: SHOP_NAME, fruit: 'Նուռ', quantity: 14 },
  { daysAgo: 3, shop: SHOP_NAME, fruit: 'Խաղող',       quantity: 6 },
  { daysAgo: 3, shop: SHOP_NAME, fruit: 'Նուռ', quantity: 18 },
  { daysAgo: 3, shop: SHOP_NAME, fruit: 'Բանան',      quantity: 7 },
  { daysAgo: 3, shop: SHOP_NAME,    fruit: 'Խնձոր',       quantity: 6 },

  // 2 days ago
  { daysAgo: 2, shop: SHOP_NAME, fruit: 'Ձմերուկ',  quantity: 4 },
  { daysAgo: 2, shop: SHOP_NAME, fruit: 'Խնձոր',       quantity: 11 },
  { daysAgo: 2, shop: SHOP_NAME, fruit: 'Բանան',      quantity: 9 },
  { daysAgo: 2, shop: SHOP_NAME, fruit: 'Խաղող',       quantity: 5 },
  { daysAgo: 2, shop: SHOP_NAME, fruit: 'Խնձոր',       quantity: 6 },
  { daysAgo: 2, shop: SHOP_NAME,    fruit: 'Բանան',      quantity: 8 },
  { daysAgo: 2, shop: SHOP_NAME,    fruit: 'Նուռ', quantity: 9 },

  // yesterday
  { daysAgo: 1, shop: SHOP_NAME, fruit: 'Խնձոր',       quantity: 14 },
  { daysAgo: 1, shop: SHOP_NAME, fruit: 'Ձմերուկ',  quantity: 5 },
  { daysAgo: 1, shop: SHOP_NAME, fruit: 'Ելակ',  quantity: 4 },
  { daysAgo: 1, shop: SHOP_NAME, fruit: 'Նուռ', quantity: 10 },
  { daysAgo: 1, shop: SHOP_NAME, fruit: 'Նուռ', quantity: 12 },
  { daysAgo: 1, shop: SHOP_NAME, fruit: 'Բանան',      quantity: 5 },
  { daysAgo: 1, shop: SHOP_NAME, fruit: 'Խաղող',       quantity: 4 },
  { daysAgo: 1, shop: SHOP_NAME,    fruit: 'Նուռ', quantity: 11 },
  { daysAgo: 1, shop: SHOP_NAME,    fruit: 'Ելակ',  quantity: 2 },

  // today
  { daysAgo: 0, shop: SHOP_NAME, fruit: 'Խնձոր',       quantity: 6 },
  { daysAgo: 0, shop: SHOP_NAME, fruit: 'Բանան',      quantity: 4 },
  { daysAgo: 0, shop: SHOP_NAME, fruit: 'Ելակ',  quantity: 3 },
  { daysAgo: 0, shop: SHOP_NAME, fruit: 'Ձմերուկ',  quantity: 2 },
  { daysAgo: 0, shop: SHOP_NAME, fruit: 'Խնձոր',       quantity: 5 },
  { daysAgo: 0, shop: SHOP_NAME,    fruit: 'Նուռ', quantity: 6 },
  { daysAgo: 1, shop: SHOP_NAME, fruit: 'Լոլիկ', quantity: 8 },
  { daysAgo: 0, shop: SHOP_NAME, fruit: 'Վարագույն պղպեղ', quantity: 4 },
  { daysAgo: 3, shop: SHOP_NAME, fruit: 'Կազմարինի կաղամբ', quantity: 6 },
];

async function main() {
  await waitForStrapi();

  const { data: existingShops } = await api(
    'GET',
    '/api/shops?pagination[pageSize]=1&fields[0]=id',
  );
  if (existingShops.length > 0 && !RESET) {
    console.log(
      'Տվյալների բազայում արդեն կան գրառումներ։ Լրացնելու համար գործարկեք —reset կամ `pnpm --filter strapi seed:reset`։',
    );
    return;
  }

  if (RESET) {
    console.log('Ջնջվում են հին տվյալները…');
    // Delete dependents first to keep relations happy.
    await deleteAll('sale-items');
    await deleteAll('stock-arrivals');
    await deleteAll('fruits');
    await deleteAll('shops');
  }

  console.log('Լցվում են խանութները…');
  const shopByName = {};
  for (const def of SHOP_DEFS) {
    const { data } = await api('POST', '/api/shops', { data: def });
    shopByName[def.name] = data;
    console.log(`  + Խանութ՝ ${data.name}${data.isActive ? '' : ' (չակտիվ)'}`);
  }

  console.log('Լցվում են մրգերն ու բանջարեղենը…');
  const fruitByName = {};
  for (const def of FRUIT_DEFS) {
    const { data } = await api('POST', '/api/fruits', { data: def });
    fruitByName[def.name] = data;
    console.log(`  + Ապրանք՝ ${data.name} (${data.unit})`);
  }

  console.log('Լցվում են մուտքերը…');
  for (const a of STOCK_ARRIVALS) {
    const fruit = fruitByName[a.fruit];
    const shop = shopByName[a.shop];
    const { unitCost } = PRICING[a.fruit];
    const date = isoDaysAgo(a.daysAgo);
    await api('POST', '/api/stock-arrivals', {
      data: {
        date,
        shop: shop.id,
        fruit: fruit.id,
        quantity: a.quantity,
        unitCost,
        transportCost: a.transportCost,
      },
    });
    console.log(
      `  + Մուտք ${date} | ${a.quantity}${fruit.unit} ${a.fruit} · ինքնարժեք ${unitCost} · տրանսպորտ ${a.transportCost}`,
    );
  }

  console.log('Լցվում են վաճառքները…');
  for (const s of SALE_ITEMS) {
    const fruit = fruitByName[s.fruit];
    const shop = shopByName[s.shop];
    const { pricePerUnit } = PRICING[s.fruit];
    const date = isoDaysAgo(s.daysAgo);
    await api('POST', '/api/sale-items', {
      data: {
        date,
        shop: shop.id,
        fruit: fruit.id,
        quantity: s.quantity,
        pricePerUnit,
      },
    });
    console.log(
      `  + Վաճառք ${date} | ${s.quantity}${fruit.unit} ${s.fruit} · գին ${pricePerUnit}`,
    );
  }

  console.log('\nԱվարտված է։');
  console.log(
    `  խանութներ՝ ${SHOP_DEFS.length}\n  ապրանքներ՝ ${FRUIT_DEFS.length}\n  մուտքեր՝ ${STOCK_ARRIVALS.length}\n  վաճառքի գրառումներ՝ ${SALE_ITEMS.length}`,
  );
}

main().catch((err) => {
  console.error('\nՍերմը ձախողվեց՝', err.message);
  process.exit(1);
});

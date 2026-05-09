import { factories } from '@strapi/strapi';
import { allocateTransportAmongLines } from '../../../utils/allocate-transport';

export default factories.createCoreController('api::stock-arrival.stock-arrival', ({ strapi }) => ({
  async bulkCreate(ctx) {
    const body = ctx.request.body as {
      data?: {
        date?: string;
        shop?: number;
        totalTransportCost?: number;
        items?: Array<{ fruitId: number; quantity: number; unitCost: number }>;
      };
    };

    const { date, shop, totalTransportCost, items } = body.data ?? {};

    if (
      !date ||
      typeof shop !== 'number' ||
      typeof totalTransportCost !== 'number' ||
      totalTransportCost < 0 ||
      !Array.isArray(items) ||
      items.length === 0
    ) {
      return ctx.badRequest(
        'date, shop, totalTransportCost (≥0) և ոչ դատարկ items դաշտերը պարտադիր են',
      );
    }

    const normalized = items
      .map((item) => ({
        fruitId: item.fruitId,
        quantity: Number(item.quantity),
        unitCost: Number(item.unitCost),
      }))
      .filter(
        (item) =>
          typeof item.fruitId === 'number' &&
          Number.isFinite(item.quantity) &&
          item.quantity > 0 &&
          Number.isFinite(item.unitCost) &&
          item.unitCost >= 0,
      );

    if (normalized.length === 0) {
      return ctx.badRequest('Ոչ մի վավեր տող չկա (քանակ > 0, միավորի արժեք ≥ 0)');
    }

    const transportShares = allocateTransportAmongLines(
      normalized.map((i) => ({ quantity: i.quantity, unitCost: i.unitCost })),
      totalTransportCost,
    );

    const created: unknown[] = [];

    for (let idx = 0; idx < normalized.length; idx++) {
      const item = normalized[idx];
      const transportCost = transportShares[idx] ?? 0;

      const doc = await strapi.documents('api::stock-arrival.stock-arrival').create({
        data: {
          date,
          shop,
          fruit: item.fruitId,
          quantity: item.quantity,
          unitCost: item.unitCost,
          transportCost,
        },
      });
      created.push(doc);
    }

    return ctx.send({ data: created }, 201);
  },
}));

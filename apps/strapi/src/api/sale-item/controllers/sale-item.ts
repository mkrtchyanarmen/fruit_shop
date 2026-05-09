import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::sale-item.sale-item', ({ strapi }) => ({
  async bulkCreate(ctx) {
    const body = ctx.request.body as {
      data?: {
        date?: string;
        shop?: number;
        items?: Array<{ fruitId: number; quantity: number; pricePerUnit: number }>;
      };
    };

    const { date, shop, items } = body.data ?? {};

    if (!date || typeof shop !== 'number' || !Array.isArray(items) || items.length === 0) {
      return ctx.badRequest('date, shop և ոչ դատարկ items դաշտերը պարտադիր են');
    }

    const created: unknown[] = [];

    for (const item of items) {
      const { fruitId, quantity, pricePerUnit } = item;
      if (
        typeof fruitId !== 'number' ||
        typeof quantity !== 'number' ||
        typeof pricePerUnit !== 'number' ||
        quantity <= 0 ||
        pricePerUnit <= 0
      ) {
        continue;
      }

      const doc = await strapi.documents('api::sale-item.sale-item').create({
        data: {
          date,
          shop,
          fruit: fruitId,
          quantity,
          pricePerUnit,
        },
      });
      created.push(doc);
    }

    if (created.length === 0) {
      return ctx.badRequest('Ոչ մի վավեր տող չի ստեղծվել');
    }

    return ctx.send({ data: created }, 201);
  },
}));

import type { Core } from '@strapi/strapi';

const PUBLIC_API_ACTIONS = ['find', 'findOne', 'create', 'update', 'delete'];

const PUBLIC_API_CONTENT_TYPES = [
  'api::shop.shop',
  'api::fruit.fruit',
  'api::stock-arrival.stock-arrival',
  'api::sale-item.sale-item',
];

// Allow image upload + read so the admin UI can attach images to fruits and the
// frontend can fetch them through the REST API without auth.
const PUBLIC_UPLOAD_ACTIONS = [
  'plugin::upload.content-api.find',
  'plugin::upload.content-api.findOne',
  'plugin::upload.content-api.upload',
  'plugin::upload.content-api.destroy',
];

async function ensurePublicPermissions({ strapi }: { strapi: Core.Strapi }) {
  const publicRole = await strapi.db
    .query('plugin::users-permissions.role')
    .findOne({ where: { type: 'public' } });

  if (!publicRole) {
    strapi.log.warn(
      '[bootstrap] Public role not found; skipping permission seeding.',
    );
    return;
  }

  const apiActions = PUBLIC_API_CONTENT_TYPES.flatMap((uid) =>
    PUBLIC_API_ACTIONS.map((action) => `${uid}.${action}`),
  );
  const allActions = [...apiActions, ...PUBLIC_UPLOAD_ACTIONS];

  for (const action of allActions) {
    const existing = await strapi.db
      .query('plugin::users-permissions.permission')
      .findOne({ where: { action, role: publicRole.id } });

    if (!existing) {
      await strapi.db.query('plugin::users-permissions.permission').create({
        data: { action, role: publicRole.id },
      });
      strapi.log.info(`[bootstrap] Granted public permission: ${action}`);
    }
  }
}

export default {
  /**
   * An asynchronous register function that runs before
   * your application is initialized.
   */
  register(/* { strapi }: { strapi: Core.Strapi } */) {},

  /**
   * An asynchronous bootstrap function that runs before
   * your application gets started.
   *
   * Seeds public REST API + Upload permissions so the Next.js frontend can
   * read & write without authentication (per project requirements).
   */
  async bootstrap({ strapi }: { strapi: Core.Strapi }) {
    await ensurePublicPermissions({ strapi });
  },
};

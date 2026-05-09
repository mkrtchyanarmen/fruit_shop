import path from 'path';
import type { Core } from '@strapi/strapi';

/** `as unknown as Database`: env-driven client breaks Strapi’s sqlite/postgres connection discriminated types during `strapi build`. */
export default ({ env }: Core.Config.Shared.ConfigParams): Core.Config.Database => {
  const client = env('DATABASE_CLIENT', 'sqlite');

  if (client === 'postgres') {
    return {
      connection: {
        client: 'postgres',
        connection: {
          connectionString: env('DATABASE_URL'),
          ssl: { rejectUnauthorized: false },
        },
      },
    } as unknown as Core.Config.Database;
  }

  return {
    connection: {
      client: 'sqlite',
      connection: {
        filename: path.join(__dirname, '..', '.tmp/data.db'),
      },
      useNullAsDefault: true,
    },
  } as unknown as Core.Config.Database;
};

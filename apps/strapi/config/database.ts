import path from 'path';
import type { Core } from '@strapi/strapi';

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
    };
  }

  return {
    connection: {
      client: 'sqlite',
      connection: {
        filename: path.join(__dirname, '..', '.tmp/data.db'),
      },
      useNullAsDefault: true,
    },
  };
};

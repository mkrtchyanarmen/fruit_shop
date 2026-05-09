import path from 'path';
import type { Core } from '@strapi/strapi';

export default ({ env }: Core.Config.Shared.ConfigParams): Core.Config.Database => {
  const client = env('DATABASE_CLIENT', 'sqlite');

  if (client === 'postgres') {
    const databaseUrl = env('DATABASE_URL');
    const url = new URL(databaseUrl);

    return {
      connection: {
        client: 'postgres',
        connection: {
          host: url.hostname,
          port: parseInt(url.port || '5432', 10),
          database: url.pathname.slice(1),
          user: url.username,
          password: url.password,
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

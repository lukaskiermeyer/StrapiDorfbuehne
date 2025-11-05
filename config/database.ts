import path from 'path';

module.exports = ({ env }) => {
  // Überprüfen, ob eine DATABASE_URL vorhanden ist (wird von Render, Neon etc. oft bereitgestellt)
  if (env('DATABASE_URL')) {
    const { host, port, database, user, password } = require('pg-connection-string').parse(env('DATABASE_URL'));
    return {
      connection: {
        client: 'postgres',
        connection: {
          host,
          port,
          database,
          user,
          password,
          ssl: { rejectUnauthorized: false }, // Wichtig für die meisten Cloud-DBs
        },
        debug: false,
      },
    };
  }

  // Fallback auf die einzelnen Umgebungsvariablen
  const client = env('DATABASE_CLIENT', 'sqlite');

  if (client === 'sqlite') {
    return {
      connection: {
        client: 'sqlite',
        connection: {
          filename: path.join(__dirname, '..', env('DATABASE_FILENAME', '.tmp/data.db')),
        },
        useNullAsDefault: true,
      },
    };
  }

  // Konfiguration für Postgres basierend auf einzelnen Variablen
  return {
    connection: {
      client: 'postgres',
      connection: {
        host: env('DATABASE_HOST', '127.0.0.1'),
        port: env.int('DATABASE_PORT', 5432),
        database: env('DATABASE_NAME', 'strapi'),
        user: env('DATABASE_USERNAME', 'strapi'),
        password: env('DATABASE_PASSWORD', 'strapi'),
        ssl: env.bool('DATABASE_SSL', false) ? { rejectUnauthorized: false } : false,
      },
      debug: false,
    },
  };
};

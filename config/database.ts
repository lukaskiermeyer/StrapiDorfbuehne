const path = require('path');

module.exports = ({ env }) => {
  // Lokale SQLite Konfiguration für die Entwicklung
  if (env('NODE_ENV') === 'development') {
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

  // Production-Konfiguration für Postgres (Cloud Run, Supabase etc.)
  return {
    connection: {
      client: 'postgres',
      connection: {
        host: env('DATABASE_HOST'),
        port: env.int('DATABASE_PORT', 5432),
        database: env('DATABASE_NAME'),
        user: env('DATABASE_USERNAME'),
        password: env('DATABASE_PASSWORD'),
        // SSL-Einstellungen für Cloud-Datenbanken wie Supabase
        ssl: {
          rejectUnauthorized: env.bool('DATABASE_SSL_SELF_SIGNED', false),
        },
      },
      debug: false,
    },
  };
};

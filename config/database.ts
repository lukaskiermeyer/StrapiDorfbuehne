import path from 'path';

export default ({ env }) => {
  const client = env('DATABASE_CLIENT', 'postgres');

  const connections = {
    postgres: {
      connection: {
        connectionString: env('DATABASE_URL'),
        ssl: env.bool('DATABASE_SSL', true) && {
          rejectUnauthorized: env.bool('DATABASE_SSL_REJECT_UNAUTHORIZED', false),
        },
        schema: env('DATABASE_SCHEMA', 'public'),
      },
      pool: {
        // WICHTIG für Neon Free Tier:
        // min: 0 bedeutet: Strapi darf alle Verbindungen schließen, wenn nichts los ist.
        // Das verhindert "tote" Verbindungen, wenn Neon einschläft.
        min: 0,
        max: env.int('DATABASE_POOL_MAX', 10),

        // Timeouts massiv erhöhen, damit Neon Zeit hat, aus dem "Sleep" aufzuwachen (Cold Start)
        acquireTimeoutMillis: 60000, // Wartet bis zu 60s auf eine freie Verbindung
        createTimeoutMillis: 60000,  // Wartet bis zu 60s, bis eine neue Verbindung steht

        idleTimeoutMillis: 30000,    // Ungenutzte Verbindungen nach 30s schließen
        reapIntervalMillis: 1000,    // Jede Sekunde prüfen, ob aufgeräumt werden muss
        createRetryIntervalMillis: 200, // Bei Fehler schnell nochmal versuchen
      },
    },
  };

  return {
    connection: {
      client,
      ...connections.postgres,
      acquireConnectionTimeout: env.int('DATABASE_CONNECTION_TIMEOUT', 60000),
    },
  };
};
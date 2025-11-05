import path from 'path';

export default ({ env }) => {
  // Der 'client'-Wert von oben wird nicht verwendet, aber es ist gut, wenn DATABASE_CLIENT nicht auf 'sqlite' gesetzt ist.
  const client = env('DATABASE_CLIENT', 'sqlite');

  const connections = {
    postgres: {
      connection: {
        // NUR die Connection String verwenden
        connectionString: env('DATABASE_URL'),

        // Host, Port, Database, User, Password wurden entfernt, 
        // da sie alle in DATABASE_URL enthalten sind.

        // Beibehalten der benötigten Optionen für SSL und Schema
        ssl: env.bool('DATABASE_SSL', true) && {
          rejectUnauthorized: env.bool('DATABASE_SSL_REJECT_UNAUTHORIZED', false),
        },
        schema: env('DATABASE_SCHEMA', 'public'),
      },
      pool: { min: env.int('DATABASE_POOL_MIN', 2), max: env.int('DATABASE_POOL_MAX', 10) },
    },
  };

  return {
    connection: {
      client: env('DATABASE_CLIENT', 'postgres'),
      ...connections.postgres,
      acquireConnectionTimeout: env.int('DATABASE_CONNECTION_TIMEOUT', 60000),
    },
  };
};
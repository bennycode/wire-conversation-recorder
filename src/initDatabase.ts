import 'reflect-metadata';
import {Connection, createConnection} from 'typeorm';
import {PostgresConnectionOptions} from 'typeorm/driver/postgres/PostgresConnectionOptions';
import {SqliteConnectionOptions} from 'typeorm/driver/sqlite/SqliteConnectionOptions';
import {MessageEntity} from './entity/MessageEntity';

export default function initDatabase(): Promise<Connection> {
  const localhost: SqliteConnectionOptions = {
    database: 'test.db3',
    type: 'sqlite',
  };

  const production: PostgresConnectionOptions = {
    type: 'postgres',
    url: process.env.DATABASE_URL,
  };

  const connectionOptions = process.env.NODE_ENV === 'production' ? localhost : localhost;

  Object.assign(connectionOptions, {
    entities: [MessageEntity],
    logging: false,
    migrations: ['src/migration/**/*.ts'],
    subscribers: ['src/subscriber/**/*.ts'],
    synchronize: true,
  });

  return createConnection(connectionOptions);
}

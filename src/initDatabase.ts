import 'reflect-metadata';
import {Connection, ConnectionOptions, createConnection} from 'typeorm';
import {MessageEntity} from './entity/MessageEntity';

function getConnectionOptions(): ConnectionOptions {
  const amazonRDS: ConnectionOptions = {
    database: String(process.env.RDS_DB_NAME),
    host: String(process.env.RDS_HOSTNAME),
    password: String(process.env.RDS_PASSWORD),
    port: parseInt(String(process.env.RDS_PORT), 10),
    type: 'mysql',
    username: String(process.env.RDS_USERNAME),
  };

  const localhost: ConnectionOptions = {
    database: 'test.db3',
    type: 'sqlite',
  };

  return process.env.NODE_ENV === 'production' ? amazonRDS : localhost;
}

export default function initDatabase(): Promise<Connection> {
  const connectionOptions = getConnectionOptions();

  Object.assign(connectionOptions, {
    entities: [MessageEntity],
    logging: false,
    migrations: ['src/migration/**/*.ts'],
    subscribers: ['src/subscriber/**/*.ts'],
    synchronize: true,
  });

  return createConnection(connectionOptions);
}

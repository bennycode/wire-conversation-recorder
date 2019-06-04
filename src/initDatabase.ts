import 'reflect-metadata';
import {Connection, createConnection} from 'typeorm';
import {MysqlConnectionOptions} from 'typeorm/driver/mysql/MysqlConnectionOptions';
import {MessageEntity} from './entity/MessageEntity';

export default function initDatabase(): Promise<Connection> {
  const connectionOptions: MysqlConnectionOptions = {
    database: String(process.env.RDS_DB_NAME),
    host: String(process.env.RDS_HOSTNAME),
    password: String(process.env.RDS_PASSWORD),
    port: parseInt(String(process.env.RDS_PORT), 10),
    type: 'mysql',
    username: String(process.env.RDS_USERNAME),
  };

  Object.assign(connectionOptions, {
    entities: [MessageEntity],
    logging: false,
    migrations: ['src/migration/**/*.ts'],
    subscribers: ['src/subscriber/**/*.ts'],
    synchronize: true,
  });

  return createConnection(connectionOptions);
}

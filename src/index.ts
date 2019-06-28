import {ClientType} from '@wireapp/api-client/dist/commonjs/client';
import {Bot} from '@wireapp/bot-api';

import {AutoConnectHandler} from './handler/AutoConnectHandler';
import {DebugHandler} from './handler/DebugHandler';
import {AutoCallHandler} from "./handler/AutoCallHandler";

require('dotenv').config();

const credentials = {
  email: String(process.env.WIRE_EMAIL),
  password: String(process.env.WIRE_PASSWORD),
};

const bot = new Bot(credentials, {
  clientType: ClientType.TEMPORARY,
});

bot.addHandler(new AutoConnectHandler());
bot.addHandler(new AutoCallHandler());
bot.addHandler(new DebugHandler());

// bot.addHandler(new RecordHandler());
// bot.addHandler(new TimeHandler());
// bot.addHandler(new UptimeHandler());
// bot.addHandler(new VersionHandler());

bot.start();

// initDatabase()
//   .then(() => bot.start())
//   .then(() => console.log(`Bot runs with account "${credentials.email}" ...`))
//   .catch(error => console.error(`Bot fails with "${credentials.email}": ${error.message}`, error));

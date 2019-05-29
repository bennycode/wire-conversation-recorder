import {ClientType} from '@wireapp/api-client/dist/commonjs/client';
import {Bot} from '@wireapp/bot-api';

import {DebugHandler} from './handler/DebugHandler';
import {TimeHandler} from './handler/TimeHandler';
import {UptimeHandler} from './handler/UptimeHandler';
import {VersionHandler} from './handler/VersionHandler';

require('dotenv').config();

const credentials = {
  email: String(process.env.WIRE_EMAIL),
  password: String(process.env.WIRE_PASSWORD),
};

const bot = new Bot(credentials, {
  clientType: ClientType.TEMPORARY,
});

bot.addHandler(new DebugHandler());
bot.addHandler(new TimeHandler());
bot.addHandler(new VersionHandler());
bot.addHandler(new UptimeHandler());

bot
  .start()
  .then(() => {
    console.log(`Bot runs with account "${credentials.email}" ...`);
  })
  .catch(error => {
    console.error(`Bot fails with "${credentials.email}": ${error.message}`, error);
  });

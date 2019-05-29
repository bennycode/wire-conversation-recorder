import {MessageHandler} from '@wireapp/bot-api';
import {PayloadBundle, PayloadBundleType} from '@wireapp/core/dist/conversation/';
import {TextContent} from '@wireapp/core/dist/conversation/content';
import * as moment from 'moment';
import 'moment-duration-format';

class UptimeHandler extends MessageHandler {
  async handleEvent(payload: PayloadBundle): Promise<void> {
    switch (payload.type) {
      case PayloadBundleType.TEXT:
        const content = payload.content as TextContent;
        if (content.text === '/uptime') {
          const seconds: number = Math.floor(process.uptime());
          const formatted: string = moment.duration(seconds, 'seconds').format({
            precision: 0,
            template: 'y [years], w [weeks], d [days], h [hours], m [minutes], s [seconds]',
          });

          await this.sendText(payload.conversation, `Running since: ${formatted}`);
        }
        break;
    }
  }
}

export {UptimeHandler};

import {MessageHandler} from '@wireapp/bot-api';
import {PayloadBundle, PayloadBundleType} from '@wireapp/core/dist/conversation/';
import {TextContent} from '@wireapp/core/dist/conversation/content';
import moment = require('moment-timezone');

class TimeHandler extends MessageHandler {
  async handleEvent(payload: PayloadBundle): Promise<void> {
    if (payload.type === PayloadBundleType.TEXT) {
      const content = payload.content as TextContent;
      if (content.text === '/time') {
        const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const currentTime = moment()
          .tz(timeZone)
          .format();
        await this.sendText(payload.conversation, `On my machine in "${timeZone}" it is "${currentTime}".`);
      }
    }
  }
}

export {TimeHandler};

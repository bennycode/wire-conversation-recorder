import {MessageHandler} from '@wireapp/bot-api';
import {PayloadBundle, PayloadBundleType} from '@wireapp/core/dist/conversation/';
import {TextContent} from '@wireapp/core/dist/conversation/content';

class RecordHandler extends MessageHandler {
  async handleEvent(payload: PayloadBundle): Promise<void> {
    switch (payload.type) {
      case PayloadBundleType.TEXT:
        if (this.account && this.account.service) {
          const user = await this.account.service.user.getUsers([payload.from]);
          const text = (payload.content as TextContent).text;
          console.log(`${user[0].name}: ${text}`);
        }
        break;
    }
  }
}

export {RecordHandler};

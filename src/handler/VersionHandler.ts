import {MessageHandler} from '@wireapp/bot-api';
import {PayloadBundle, PayloadBundleType} from '@wireapp/core/dist/conversation/';
import {TextContent} from '@wireapp/core/dist/conversation/content';

class VersionHandler extends MessageHandler {
  async handleEvent(payload: PayloadBundle): Promise<void> {
    if (payload.type === PayloadBundleType.TEXT) {
      const content = payload.content as TextContent;
      if (content.text === '/version') {
        await this.sendText(payload.conversation, `Running ${process.env.npm_package_name} v${process.env.npm_package_version}`);
      }
    }
  }
}

export {VersionHandler};

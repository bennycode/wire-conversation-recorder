import {MessageHandler} from '@wireapp/bot-api';
import {PayloadBundle, PayloadBundleType} from '@wireapp/core/dist/conversation/';
import {TextContent} from '@wireapp/core/dist/conversation/content';

class DebugHandler extends MessageHandler {
  async handleEvent(payload: PayloadBundle): Promise<void> {
    switch (payload.type) {
      case PayloadBundleType.TEXT:
        const text = (payload.content as TextContent).text;
        switch (text) {
          case '/conversation':
            const conversationText = `The ID of this conversation is "${payload.conversation}".`;
            await this.sendText(payload.conversation, conversationText);
            break;
          case '/user':
            const userText = `Your user ID is "${String(payload.from)}".`;
            await this.sendText(payload.conversation, userText);
            break;
        }
        break;
    }
  }
}

export {DebugHandler};

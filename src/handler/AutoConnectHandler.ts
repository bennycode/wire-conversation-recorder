import {Connection} from '@wireapp/api-client/dist/commonjs/connection';
import {MessageHandler} from '@wireapp/bot-api';
import {PayloadBundle, PayloadBundleType} from '@wireapp/core/dist/conversation/';

class AutoConnectHandler extends MessageHandler {
  async handleEvent(payload: PayloadBundle): Promise<void> {
    switch (payload.type) {
      case PayloadBundleType.CONNECTION_REQUEST:
        const content = payload.content as Connection;
        await this.sendConnectionResponse(content.to, true).catch(error => {
          console.warn(`Failed to accept connection request from "${payload.from}": ${error.message}`, error);
        });
        break;
    }
  }
}

export {AutoConnectHandler};

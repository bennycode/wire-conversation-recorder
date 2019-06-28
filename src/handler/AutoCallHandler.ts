import {MessageHandler} from "@wireapp/bot-api";
import {PayloadBundle, PayloadBundleType} from '@wireapp/core/dist/conversation/';
import {CallingContent} from "@wireapp/core/dist/conversation/content";
import {CALL_TYPE, ENV, getAvsInstance} from "@wireapp/avs";

class AutoCallHandler extends MessageHandler {
  async handleEvent(payload: PayloadBundle): Promise<void> {
    switch (payload.type) {
      case PayloadBundleType.CALL:
        if (this.account) {
          const content = payload.content as CallingContent;
          const incomingPayload = JSON.parse(content);

          const wCall = await getAvsInstance();
          setInterval(() => wCall.poll(), 500);
          wCall.init(ENV.DEFAULT);

          const requestConfig = () => {
            setTimeout(() => {
              wCall.configUpdate(wUser, 0, JSON.stringify({ice_servers: []}));
            });
            return 0;
          };

          const sendMsg = (context: number, conversationId: string, userId: string, clientId: string, destinationUserId: string, destinationClientId: string, payload: string) => {
            this.sendCall(conversationId, payload);
            return 0;
          };

          const incoming = (conversationId: string) => wCall.answer(wUser, conversationId, CALL_TYPE.NORMAL, 0);

          const wUser = wCall.create(
            this.account.userId,
            this.account.clientId,
            () => {
            }, //readyh,
            sendMsg, //sendh,
            incoming, //incomingh,
            () => {
            }, //missedh,
            () => {
            }, //answerh,
            () => {
            }, //estabh,
            () => {
            }, //closeh,
            () => {
            }, //metricsh,
            requestConfig, //cfg_reqh,
            () => {
            }, //acbrh,
            () => {
            }, //vstateh,
            0
          );
        }
        break;
    }
  }
}

export {AutoCallHandler};

import {MessageHandler} from '@wireapp/bot-api';
import {PayloadBundle, PayloadBundleType} from '@wireapp/core/dist/conversation/';
import {FileContent, FileMetaDataContent, TextContent} from '@wireapp/core/dist/conversation/content';
import fs from 'fs-extra';
import mime from 'mime-types';
import path from 'path';

class RecordHandler extends MessageHandler {
  async recordText(payload: PayloadBundle): Promise<void> {
    if (this.account && this.account.service) {
      const user = await this.account.service.user.getUsers([payload.from]);
      const text = (payload.content as TextContent).text;
      console.log(`${user[0].name}: ${text}`);
    }
  }

  async respondToText(payload: PayloadBundle): Promise<void> {
    const content = payload.content as TextContent;
    if (content.text === '/export') {
      const filePath = path.resolve(process.cwd(), 'this-is-a-fox.txt');
      console.log(`Sending file "${filePath}" ...`);
      await this.sendPDF(payload, filePath);
    }
  }

  extractDataContentType(encoded: string): string | undefined {
    let result = undefined;
    const mime = encoded.match(/data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+).*,.*/);

    if (mime && mime.length) {
      result = mime[1];
    }

    return result;
  }

  extractContentType(base64Data: string, filePath: string): string {
    let contentType = this.extractDataContentType(base64Data);

    if (!contentType) {
      if (mime.lookup(filePath) !== false) {
        contentType = String(mime.lookup(filePath));
      } else {
        contentType = 'text/plain';
      }
    }

    return contentType;
  }

  async sendPDF(payload: PayloadBundle, filePath: string): Promise<void> {
    if (this.account && this.account.service) {
      const base64String = await fs.readFile(filePath, 'utf8');

      // Strip data type when building the buffer:
      let base64Data = base64String;
      const base64DataCheck = /,(.+)/.exec(base64String);
      if (base64DataCheck && base64DataCheck[1]) {
        base64Data = base64DataCheck[1];
      }

      const data = Buffer.from(base64Data, 'base64');
      const fileContent: FileContent = {data};
      const givenExtension = path.extname(filePath);
      const fileName = path.basename(filePath, givenExtension);
      const contentType: string = this.extractContentType(base64String, filePath);
      const newFileName = `${fileName}.${String(mime.extension(contentType))}`;

      console.log(
        'File info',
        JSON.stringify({
          contentType,
          fileName,
          givenExtension,
          newFileName,
        })
      );

      const metadata: FileMetaDataContent = {length: data.length, name: newFileName, type: contentType};

      const conversationId = payload.conversation;
      const metadataPayload = await this.account.service.conversation.messageBuilder.createFileMetadata(
        conversationId,
        metadata
      );

      await this.account.service.conversation.send(metadataPayload);

      const filePayload = await this.account.service.conversation.messageBuilder.createFileData(
        conversationId,
        fileContent,
        metadataPayload.id
      );
      await this.account.service.conversation.send(filePayload);
    }
  }

  async handleEvent(payload: PayloadBundle): Promise<void> {
    switch (payload.type) {
      case PayloadBundleType.TEXT:
        await this.recordText(payload);
        await this.respondToText(payload);
        break;
    }
  }
}

export {RecordHandler};

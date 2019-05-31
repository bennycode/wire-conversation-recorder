import {MessageHandler} from '@wireapp/bot-api';
import {PayloadBundle, PayloadBundleType} from '@wireapp/core/dist/conversation/';
import {FileContent, FileMetaDataContent, TextContent} from '@wireapp/core/dist/conversation/content';
import fs from 'fs-extra';
import mime from 'mime-types';
import path from 'path';

const Printer = require('pdfmake');

class RecordHandler extends MessageHandler {
  private readonly pdfContent: string[] = ['Wire Conversation'];

  async recordText(payload: PayloadBundle): Promise<void> {
    if (this.account && this.account.service) {
      const user = await this.account.service.user.getUsers([payload.from]);
      const text = (payload.content as TextContent).text;
      const logMessage = `${user[0].name}: ${text}`;
      this.pdfContent.push(logMessage);
      console.log('Logged', logMessage);
    }
  }

  // Read more: https://pdfmake.github.io/docs/fonts/standard-14-fonts/
  generatePdf(): Promise<string> {
    const fontDescriptors = {
      Roboto: {
        bold: path.resolve(process.cwd(), 'fonts/Roboto-Medium.ttf'),
        bolditalics: path.resolve(process.cwd(), 'fonts/Roboto-MediumItalic.ttf'),
        italics: path.resolve(process.cwd(), 'fonts/Roboto-Italic.ttf'),
        normal: path.resolve(process.cwd(), 'fonts/Roboto-Regular.ttf'),
      },
    };

    const printer = new Printer(fontDescriptors);
    const pdfDefinition = {
      content: this.pdfContent,
      defaultStyle: {
        font: 'Roboto',
        fontSize: 11,
        lineHeight: 1.2,
      },
      info: {
        title: 'Wire Conversation Export',
      },
    };

    const pdfDocument = printer.createPdfKitDocument(pdfDefinition);

    const chunks: any[] = [];

    return new Promise(resolve => {
      pdfDocument.on('data', (chunk: any) => {
        chunks.push(chunk);
      });

      pdfDocument.on(
        'end',
        (): void => {
          const result = Buffer.concat(chunks);
          resolve(`data:application/pdf;base64,${result.toString('base64')}`);
        }
      );

      pdfDocument.end();
    });
  }

  async respondToText(payload: PayloadBundle): Promise<void> {
    const content = payload.content as TextContent;

    if (content.text === '/fox') {
      const filePath = path.resolve(process.cwd(), 'this-is-a-fox.txt');
      console.log(`Sending file "${filePath}" ...`);
      await this.sendAttachment(payload, filePath);
    } else if (content.text === '/export') {
      const base64Pdf = await this.generatePdf();
      await this.sendAttachment(payload, 'export.pdf', base64Pdf);
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

  async sendAttachment(payload: PayloadBundle, filePath: string, base64?: string): Promise<void> {
    if (this.account && this.account.service) {
      const base64String = base64 ? base64 : await fs.readFile(filePath, 'utf8');

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

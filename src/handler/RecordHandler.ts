import {MessageHandler} from '@wireapp/bot-api';
import {ValidationUtil} from '@wireapp/commons';
import {PayloadBundle, PayloadBundleType} from '@wireapp/core/dist/conversation/';
import {
  AssetContent,
  FileContent,
  FileMetaDataContent,
  RemoteData,
  TextContent,
} from '@wireapp/core/dist/conversation/content';
import {Decoder, Encoder} from 'bazinga64';
import fs from 'fs-extra';
import Jimp = require('jimp');
import mime from 'mime-types';
import moment = require('moment');
import path from 'path';
import {MessageEntity} from '../entity/MessageEntity';

const Printer = require('pdfmake');

class RecordHandler extends MessageHandler {
  constructor() {
    super();
  }

  async recordText(payload: PayloadBundle): Promise<void> {
    if (this.account && this.account.service) {
      const text = (payload.content as TextContent).text;
      const encoded = Encoder.toBase64(text);
      await this.recordMessage(payload, 'text/plain', encoded.asString);
    }
  }

  async recordMessage(payload: PayloadBundle, contentType: string, contentAsBase64: string): Promise<void> {
    if (this.account && this.account.service) {
      const user = await this.account.service.user.getUsers([payload.from]);

      const messageEntity = new MessageEntity();
      messageEntity.contentBase64 = contentAsBase64;
      messageEntity.contentType = contentType;
      messageEntity.conversationId = payload.conversation;
      messageEntity.messageId = payload.id;
      messageEntity.sendingUserId = payload.from;
      messageEntity.sendingUserName = user[0].name;
      messageEntity.timestamp = payload.timestamp.toString();

      try {
        await messageEntity.save();
      } catch (error) {
        console.warn(
          `Cannot save message "${payload.id}" from user "${payload.from}" in conversation "${payload.conversation}": ${
            error.message
          }`
        );
      }
    }
  }

  async convertImage(contentBase64: string, contentType: string = Jimp.MIME_JPEG): Promise<string> {
    const base64Header = `data:${contentType};base64,`;
    const gifImage = await Jimp.read(Buffer.from(contentBase64, 'base64'));
    const contentWithType = await gifImage.getBase64Async(contentType);
    return contentWithType.substr(base64Header.length);
  }

  async getConversationContent(conversationId: string): Promise<Object[]> {
    const contents: Object[] = [];
    const messages: MessageEntity[] = await MessageEntity.getRepository().find({
      where: {
        conversationId,
      },
    });

    for (const message of messages) {
      const time = moment(message.timestamp).format('LLLL');
      contents.push({
        font: 'Roboto',
        style: ['bold'],
        text: `${message.sendingUserName} on ${time}`,
      });

      if (message.contentType === 'text/plain') {
        const plainText = Decoder.fromBase64(message.contentBase64);
        contents.push(plainText.asString);
      } else if (message.contentType.startsWith('image/')) {
        contents.push({
          image: `data:${message.contentType};base64,${message.contentBase64}`,
          width: 200,
        });
      }

      contents.push('\n');
    }

    return Promise.resolve(contents);
  }

  async getConversationName(conversationId: string): Promise<string> {
    if (this.account && this.account.service) {
      const conversation = await this.account.service.conversation.getConversations(conversationId);
      return conversation.name;
    } else {
      return Promise.resolve('Wire Conversation Export');
    }
  }

  async generatePdf(conversationId: string): Promise<string> {
    const fontDescriptors = {
      OpenSansEmoji: {
        normal: path.resolve(process.cwd(), 'fonts/OpenSansEmoji.ttf'),
      },
      Roboto: {
        bold: path.resolve(process.cwd(), 'fonts/Roboto-Medium.ttf'),
        bolditalics: path.resolve(process.cwd(), 'fonts/Roboto-MediumItalic.ttf'),
        italics: path.resolve(process.cwd(), 'fonts/Roboto-Italic.ttf'),
        normal: path.resolve(process.cwd(), 'fonts/Roboto-Regular.ttf'),
      },
    };

    const title = await this.getConversationName(conversationId);
    const content = await this.getConversationContent(conversationId);
    content.unshift({
      style: 'header',
      text: `${title}\n\n`,
    });

    const printer = new Printer(fontDescriptors);
    const pdfDefinition = {
      content: content,
      defaultStyle: {
        font: 'OpenSansEmoji',
        fontSize: 12,
        lineHeight: 1,
      },
      styles: {
        header: {
          alignment: 'center',
          bold: true,
          font: 'Roboto',
          fontSize: 16,
        },
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
      case PayloadBundleType.ASSET_IMAGE:
        if (this.account && this.account.service) {
          const imagePayload = payload.content as AssetContent;
          const {uploaded} = imagePayload;
          const imageArray = await this.account.service.conversation.getAsset(uploaded as RemoteData);
          const base64Data = Encoder.toBase64(imageArray).asString;
          // To ensure that all image types (GIF, PNG, ...) can be rendered in the PDF, we convert them into JPEG
          const jpegContentType = Jimp.MIME_JPEG;
          const base64JPEG = await this.convertImage(base64Data, jpegContentType);
          await this.recordMessage(payload, jpegContentType, base64JPEG);
        }
        break;
      case PayloadBundleType.TEXT:
        const textPayload = payload.content as TextContent;

        if (textPayload.text === '/count') {
          const recordedMessages = await MessageEntity.getRepository().count({
            where: {
              conversationId: payload.conversation,
            },
          });
          await this.sendText(payload.conversation, `Recorded messages in this conversation: ${recordedMessages}`);
        } else if (textPayload.text.startsWith('/purge')) {
          await MessageEntity.getRepository().clear();
          await this.sendText(payload.conversation, `Deleted all recorded messages in database.`);
        } else if (textPayload.text.startsWith('/export')) {
          const uuids = textPayload.text.match(ValidationUtil.PATTERN.UUID_V4);
          const conversationId = uuids ? uuids[0] : payload.conversation;
          await this.sendText(payload.conversation, 'Generating PDF file...');
          try {
            const base64Pdf = await this.generatePdf(conversationId);
            await this.sendAttachment(payload, `${conversationId}.pdf`, base64Pdf);
          } catch (error) {
            console.error(`PDF generation failed: ${error.message}`, error);
            await this.sendText(payload.conversation, `PDF generation failed: ${error.toString()}`);
          }
        } else {
          await this.recordText(payload);
        }
        break;
    }
  }
}

export {RecordHandler};

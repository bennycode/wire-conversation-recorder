import {MessageHandler} from '@wireapp/bot-api';
import {PayloadBundle, PayloadBundleType} from '@wireapp/core/dist/conversation/';
import {
  AssetContent,
  FileContent,
  FileMetaDataContent,
  RemoteData,
  TextContent,
} from '@wireapp/core/dist/conversation/content';
import {LRUCache} from '@wireapp/lru-cache';
import {Decoder, Encoder} from 'bazinga64';
import fs from 'fs-extra';
import Jimp = require('jimp');
import mime from 'mime-types';
import moment = require('moment');
import path from 'path';
import {MessageEntity} from '../entity/MessageEntity';

const Printer = require('pdfmake');

class RecordHandler extends MessageHandler {
  private readonly cachedMessages: LRUCache<MessageEntity>;

  constructor() {
    super();
    this.cachedMessages = new LRUCache(100);
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

      await messageEntity.save();

      console.log('Stored message', JSON.stringify(messageEntity));
    }
  }

  async constructContent(): Promise<string[]> {
    const contents: any[] = [];
    const messages: MessageEntity[] = await MessageEntity.getRepository().find();

    for (const message of messages) {
      const time = moment(message.timestamp).format('LLLL');
      contents.push(`${message.sendingUserName} on ${time}`);

      if (message.contentType === 'text/plain') {
        const plainText = Decoder.fromBase64(message.contentBase64);

        contents.push(plainText.asString);
      } else if (message.contentType.startsWith('image/')) {
        if (message.contentType === Jimp.MIME_GIF) {
          // "pdfmake" cannot handle GIFs by default so we convert them into JPEG files
          const gifImage = await Jimp.read(Buffer.from(message.contentBase64, 'base64'));
          const convertedGif = await gifImage.getBase64Async(Jimp.MIME_JPEG);
          contents.push({
            image: convertedGif,
            width: 200,
          });
        } else {
          contents.push({
            image: `data:${message.contentType};base64,${message.contentBase64}`,
            width: 200,
          });
        }
      }

      contents.push('\n\n');
    }

    return Promise.resolve(contents);
  }

  // Read more: https://pdfmake.github.io/docs/fonts/standard-14-fonts/
  async generatePdf(): Promise<string> {
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

    const printer = new Printer(fontDescriptors);
    const pdfDefinition = {
      content: await this.constructContent(),
      defaultStyle: {
        font: 'OpenSansEmoji',
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
        'Sending file...',
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
      case PayloadBundleType.ASSET_IMAGE:
        if (this.account && this.account.service) {
          const imagePreview = this.cachedMessages.get(payload.id);
          if (imagePreview) {
            const imagePayload = payload.content as AssetContent;
            const {uploaded} = imagePayload;
            const imageArray = await this.account.service.conversation.getAsset(uploaded as RemoteData);
            const base64Data = Encoder.toBase64(imageArray).asString;
            await this.recordMessage(payload, imagePreview.contentType, base64Data);
            this.cachedMessages.delete(payload.id);
          }
        }
        break;
      case PayloadBundleType.ASSET_META:
        const imagePayload = payload.content as AssetContent;
        const {original} = imagePayload;
        if (original) {
          const message = new MessageEntity();
          message.contentType = original.mimeType;
          this.cachedMessages.set(payload.id, message);
        }
        break;
      case PayloadBundleType.TEXT:
        const textPayload = payload.content as TextContent;

        if (textPayload.text === '/export') {
          const base64Pdf = await this.generatePdf();
          await this.sendAttachment(payload, 'export.pdf', base64Pdf);
        } else {
          await this.recordText(payload);
        }
        break;
    }
  }
}

export {RecordHandler};

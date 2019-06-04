import {RecordHandler} from "./RecordHandler";

describe('RecordHandler', () => {
  describe('extractContentType', () => {
    it('gets the content type from a Base64 encoded image', () => {
      const handler = new RecordHandler();
      const image = 'data:image/jpeg;base64,FAKEDATA';
      const mimeType = handler.extractContentType(image, '');
      expect(mimeType).toBe('image/jpeg');
    });
  });
});

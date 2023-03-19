import assert from 'assert';
import { isReadableStream, isStream } from './helpers';
import { Readable } from 'stream';
import bufferStream from 'simple-bufferstream';
import { SendSeekableConfig, SendSeekableContent } from './send-seekable.types';

export class SendSeekableResponse {
  constructor(
    private readonly content: SendSeekableContent,
    private readonly config: SendSeekableConfig = {},
  ) {
    assert(Buffer.isBuffer(content) || isReadableStream(content));

    if (isStream(content) && !config.length) {
      throw new Error(
        'SendSeekableResponse requires `length` when a stream is passed',
      );
    }
  }

  getStream(): Readable {
    if (isReadableStream(this.content)) {
      return this.content;
    }

    return bufferStream(this.content);
  }

  getLength(): number {
    if (isReadableStream(this.content)) {
      assert(typeof this.config.length === 'number');

      return this.config.length;
    }

    return this.content.length;
  }

  getContentType() {
    return this.config.contentType;
  }
}

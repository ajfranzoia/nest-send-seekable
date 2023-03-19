import assert from 'assert';
import { Readable } from 'stream';
import bufferStream from 'simple-bufferstream';
import { SendSeekableConfig, SendSeekableContent } from './send-seekable.types';
import * as isStream from 'is-stream';

export class SendSeekableResponse {
  constructor(
    private readonly content: SendSeekableContent,
    private readonly config: SendSeekableConfig = {},
  ) {
    if (!Buffer.isBuffer(content) && !isStream.readable(content)) {
      throw new Error(
        'SendSeekableResponse requires a buffer or a valid Readable stream',
      );
    }

    if (isStream.readable(content) && !config.length) {
      throw new Error(
        'SendSeekableResponse requires `length` when a stream is passed',
      );
    }
  }

  getStream(): Readable {
    if (isStream.readable(this.content)) {
      return this.content;
    }

    return bufferStream(this.content);
  }

  getLength(): number {
    if (isStream.readable(this.content)) {
      assert(typeof this.config.length === 'number');

      return this.config.length;
    }

    return this.content.length;
  }

  getContentType() {
    return this.config.contentType;
  }
}

import { Readable } from 'stream';

export class SendSeekableConfig {
  length?: number;
  contentType?: string;
}

export type SendSeekableContent = Buffer | Readable;

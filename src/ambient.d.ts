declare module 'simple-bufferstream' {
  import { Readable } from 'stream';

  export default function bufferStream(buffer: Buffer): Readable;
}

declare module 'range-stream' {
  import { Transform } from 'stream';

  export default function rangeStream(start: number, end: number): Transform;
}

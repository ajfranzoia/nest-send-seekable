import { Readable, Stream } from 'stream';

export function isStream(stream: unknown): stream is Stream {
  return (
    stream !== null &&
    typeof stream === 'object' &&
    typeof (stream as Stream).pipe === 'function'
  );
}

export function isReadableStream(stream: unknown): stream is Readable {
  return (
    isStream(stream) &&
    (stream as Readable).readable &&
    typeof (stream as Readable)._read === 'function'
  );
}

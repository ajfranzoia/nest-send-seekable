import { SendSeekableResponse } from '../src';
import { createTestStream } from './helpers';
import { Readable } from 'stream';

describe('SendSeekableResponse', () => {
  it('instantiates class with buffer', () => {
    new SendSeekableResponse(Buffer.from('1'));
  });

  it('instantiates class with stream', () => {
    new SendSeekableResponse(createTestStream(), {
      length: 20,
    });
  });

  it('getLength() returns length for a buffer content', () => {
    const res = new SendSeekableResponse(Buffer.from('Test'));

    expect(res.getLength()).toEqual(4);
  });

  it('getStream() returns an stream for a buffer content', () => {
    const res = new SendSeekableResponse(Buffer.from('Test'));

    // can't use isStream.readable() here because it is not a valid
    // readable stream but a monkey patched implementation
    expect(typeof res.getStream().pipe).not.toBeUndefined();
  });

  it('getStream() returns the same stream for a stream content', () => {
    const stream = createTestStream();
    const res = new SendSeekableResponse(stream, {
      length: 10,
    });

    expect(res.getStream()).toBe(stream);
    expect(res.getLength()).toBe(10);
  });

  it('getContentType() returns the type if set', () => {
    const res = new SendSeekableResponse(Buffer.from('Test'), {
      contentType: 'audio/mp3',
    });

    expect(res.getContentType()).toBe('audio/mp3');
  });

  it('fails if no length is passed for a stream content', () => {
    expect(() => new SendSeekableResponse(createTestStream())).toThrowError(
      /requires `length` when a stream is passed/i,
    );
  });

  it('fails if an invalid content is passed', () => {
    expect(() => new SendSeekableResponse({} as Readable)).toThrowError(
      /requires a buffer or a valid Readable stream/i,
    );
  });
});

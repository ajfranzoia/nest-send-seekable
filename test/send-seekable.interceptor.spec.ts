import { INestApplication } from '@nestjs/common';
import { default as request } from 'supertest';
import { Ranges } from 'range-parser';
import {
  createTestApp,
  createTestStream,
  expectInvariantResponse,
  expectNoContentRange,
} from './helpers';
import { SendSeekableContent } from '../src';
import parseRange from 'range-parser';
import { Readable } from 'stream';

const contentString = 'Lorem ipsum dolor sit amet';

describe('SendSeekableInterceptor', () => {
  describe('when passed a buffer', () => {
    testContent({
      contentFn: () => Buffer.from(contentString),
      length: contentString.length,
    });
  });

  describe('when passed a stream', () => {
    testContent({
      contentFn: () => createTestStream(),
      length: contentString.length,
    });
  });

  it('fails with 500 if the given content is not a buffer or stream', async () => {
    const app = await createTestApp({} as Readable, {
      length: 1,
    });

    await request(app.getHttpServer()).get('/').expect(500);
  });

  it('fails with 500 if the route result is not a SendSeekableResponse', async () => {
    const app = await createTestApp(Buffer.from(contentString));

    await request(app.getHttpServer()).get('/invalid').expect(500);
  });

  function testContent({
    contentFn,
    length,
  }: {
    contentFn: () => SendSeekableContent;
    length: number;
  }) {
    let app: INestApplication;

    const middle = +Math.floor(length / 2);
    const later = +Math.floor(length / 2) + 5;
    const end = +length - 1;
    const beyond = +length + 50;

    beforeEach(async () => {
      app = await createTestApp(contentFn(), {
        length,
      });
    });

    afterAll(async () => {
      await app.close();
    });

    it('responds to HEAD request', async () => {
      await request(app.getHttpServer())
        .head('/')
        .expect(200)
        .expect('Content-Length', length.toString())
        .expect((res) => expect(res.text).toBeUndefined())
        .expect(expectInvariantResponse);
    });

    it('responds to GET request with full content', async () => {
      await request(app.getHttpServer())
        .get('/')
        .expect(200)
        .expect(contentString)
        .expect('Content-Length', length.toString())
        .expect(expectInvariantResponse)
        .expect(expectNoContentRange);
    });

    it('responds to GET request with Content-Type header', async () => {
      await app.close();
      app = await createTestApp(contentFn(), {
        length,
        contentType: 'audio/mp3',
      });

      await request(app.getHttpServer())
        .get('/')
        .expect(200)
        .expect((res) =>
          expect(Buffer.from(contentString).equals(res.body)).toBeTruthy(),
        )
        .expect('Content-Length', length.toString())
        .expect('Content-Type', 'audio/mp3')
        .expect(expectInvariantResponse)
        .expect(expectNoContentRange);
    });

    it('responds to GET request with full content if range unit is not bytes', async () => {
      await request(app.getHttpServer())
        .get('/')
        .set('Range', 'nonBytes=0-10')
        .expect(200)
        .expect(contentString)
        .expect('Content-Length', length.toString())
        .expect(expectInvariantResponse)
        .expect(expectNoContentRange);
    });

    describe('responds to byte range requests', function () {
      async function testRange(
        firstByte?: number | string,
        lastByte?: number | string,
      ) {
        if (typeof firstByte !== 'number') {
          firstByte = '';
        }

        if (typeof lastByte !== 'number') {
          lastByte = '';
        }

        // set requested content range
        const rangeString = 'bytes=' + firstByte + '-' + lastByte;

        // determine actual range
        const range = parseRange(length, rangeString) as Ranges;

        const trueFirst = range[0].start;
        const trueLast = range[0].end;
        const body = contentString.slice(trueFirst, trueLast + 1);

        await request(app.getHttpServer())
          .get('/')
          .set('range', rangeString)
          .expect(206)
          .expect(body)
          .expect('content-length', String(body.length))
          //.expect('content-type', type)
          .expect('content-range', `bytes ${trueFirst}-${trueLast}/${length}`)
          .expect(expectInvariantResponse);
      }

      it('returns range [0, unspecified]', () => testRange(0));

      it('returns range [0, 0]', () => testRange(0, 0));

      it('returns range [0, a middle point]', () => testRange(0, middle));

      it('returns range [0, the end]', () => testRange(0, end));

      it('returns range [0, beyond the end]', () => testRange(0, beyond));

      it('returns range [a middle point, unspecified]', () =>
        testRange(middle));

      it('returns range [a middle point, the same point]', () =>
        testRange(middle, middle));

      it('returns range [a middle point, a later point]', () =>
        testRange(middle, later));

      it('returns range [a middle point, the end]', () =>
        testRange(middle, end));

      it('returns range [a middle point, beyond the end]', () =>
        testRange(middle, beyond));

      it('returns range [the end, unspecified]', () => testRange(end));

      it('returns range [the end, the end]', () => testRange(end, end));

      it('returns range [the end, beyond the end]', () =>
        testRange(end, beyond));

      it('returns range [the last byte]', () => testRange('', 1));

      it('returns range [the last byte to the middle]', () =>
        testRange('', middle));

      it('returns range [the last byte to the beginning]', () =>
        testRange('', end + 1));
    });

    describe('for invalid byte range', () => {
      function testUnsatisfiableRange(range: string) {
        return request(app.getHttpServer())
          .get('/')
          .set('Range', 'bytes=' + range)
          .expect(416)
          .expect('Content-Range', '*/' + length);
      }

      it('<start beyond end>', () =>
        testUnsatisfiableRange(later + '-' + middle));

      it('<start beyond total>', () => testUnsatisfiableRange(beyond + '-'));

      it('<end below 0>', () => testUnsatisfiableRange('-' + beyond));

      it('<no range>', () => testUnsatisfiableRange('-'));

      it('<malformed>', () =>
        request(app.getHttpServer())
          .get('/')
          .set('Range', 'hello')
          .expect(400)
          .expect(expectNoContentRange));
    });

    describe('for unsupported byte range', () => {
      it('<multipart> throws an error', () =>
        request(app.getHttpServer())
          .get('/')
          .set('Range', 'bytes=0-4,10-14')
          .expect(500)
          .expect(expectNoContentRange));
    });
  }
});

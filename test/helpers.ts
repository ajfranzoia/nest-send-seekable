import {
  SendSeekableConfig,
  SendSeekableContent,
  SendSeekableInterceptor,
  SendSeekableResponse,
} from '../src';
import { Controller, Get, Res, UseInterceptors } from '@nestjs/common';
import express from 'express';
import { Test } from '@nestjs/testing';

export async function createTestApp(
  content: SendSeekableContent,
  config?: SendSeekableConfig,
) {
  @Controller('/')
  class TestController {
    @Get('/')
    @UseInterceptors(SendSeekableInterceptor)
    async route(@Res() res: express.Response) {
      return new SendSeekableResponse(content, config);
    }
  }

  const moduleRef = await Test.createTestingModule({
    controllers: [TestController],
  }).compile();

  const app = moduleRef.createNestApplication();
  await app.init();

  return app;
}

export function expectInvariantResponse(res: express.Response) {
  // sets the `Accept-Ranges` header to `bytes`
  expect(res.get('Accept-Ranges')).toEqual('bytes');

  // sets the `Date` header to a nonempty string
  expect(res.get('Date')).toMatch(/.+/);
}

export function expectNoContentRange(res: express.Response) {
  expect(expect(res.get('content-range')).toBeUndefined());
}

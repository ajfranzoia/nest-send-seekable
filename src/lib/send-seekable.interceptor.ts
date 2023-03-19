import rangeStream from 'range-stream';
import parseRange from 'range-parser';
import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { SendSeekableResponse } from './send-seekable.response';

@Injectable()
export class SendSeekableInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map((data) => {
        if (!(data instanceof SendSeekableResponse)) {
          throw new Error('Data must be an instance of SendSeekableResponse');
        }

        return this.sendSeekable(context, data);
      }),
    );
  }

  sendSeekable(context: ExecutionContext, data: SendSeekableResponse) {
    const req = context.switchToHttp().getRequest();
    const res = context.switchToHttp().getResponse();

    const stream = data.getStream();
    const length = data.getLength();
    const contentType = data.getContentType();

    // indicate this resource can be partially requested
    res.set('Accept-Ranges', 'bytes');
    res.set('Content-Length', length);

    if (contentType) {
      res.set('Content-Type', contentType);
    }

    // if this is not a partial request
    if (!req.headers.range) {
      return stream.pipe(res);
    }

    // if this is a partial request
    // parse ranges
    const ranges = parseRange(length, req.headers.range);

    // malformed range
    if (ranges === -2) {
      return res.sendStatus(400);
    }

    // unsatisfiable range
    if (ranges === -1) {
      res.set('Content-Range', '*/' + length);
      return res.sendStatus(416);
    }

    if (ranges.type !== 'bytes') {
      return stream.pipe(res);
    }

    if (ranges.length > 1) {
      throw new Error('Only single byte ranges can be served');
    }

    const { start, end } = ranges[0];

    // formatting response
    res.status(206);
    res.set('Content-Length', end - start + 1); // end is inclusive
    res.set('Content-Range', 'bytes ' + start + '-' + end + '/' + length);

    // slicing the stream to partial content
    return stream.pipe(rangeStream(start, end)).pipe(res);
  }
}

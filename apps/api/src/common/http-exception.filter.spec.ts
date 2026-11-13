import {
  ArgumentsHost,
  BadRequestException,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { HttpExceptionFilter } from './http-exception.filter';

function makeHost(requestId?: string) {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  const host = {
    switchToHttp: () => ({
      getResponse: () => ({ status }),
      getRequest: () => ({ id: requestId }),
    }),
  } as unknown as ArgumentsHost;
  return { host, status, json };
}

describe('HttpExceptionFilter', () => {
  const filter = new HttpExceptionFilter();

  beforeAll(() =>
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined),
  );

  it('maps a known HTTP error to its code and keeps the request id', () => {
    const { host, status, json } = makeHost('req-1');
    filter.catch(new NotFoundException('Item not found'), host);
    expect(status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith({
      error: {
        code: 'NOT_FOUND',
        message: 'Item not found',
        requestId: 'req-1',
      },
    });
  });

  it('turns validation messages into VALIDATION_FAILED with details', () => {
    const { host, status, json } = makeHost();
    filter.catch(new BadRequestException(['name should not be empty']), host);
    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({
      error: {
        code: 'VALIDATION_FAILED',
        message: 'Some fields are invalid.',
        details: ['name should not be empty'],
      },
    });
  });

  it('hides the message of a thrown 5xx HttpException', () => {
    const { host, status, json } = makeHost('req-3');
    filter.catch(
      new InternalServerErrorException(
        'relation "secret_table" does not exist',
      ),
      host,
    );
    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Something went wrong. Please try again.',
        requestId: 'req-3',
      },
    });
  });

  it('hides the message of a 503 too, keeping its code', () => {
    const { host, json } = makeHost();
    filter.catch(
      new ServiceUnavailableException('redis at 10.0.0.5 down'),
      host,
    );
    const body = (json.mock.calls[0] as [{ error: { code: string } }])[0];
    expect(body.error.code).toBe('SERVICE_UNAVAILABLE');
    expect(JSON.stringify(body)).not.toContain('10.0.0.5');
  });

  it('hides the detail of unexpected errors from the client', () => {
    const { host, status, json } = makeHost('req-2');
    filter.catch(new Error('connection string postgres://secret'), host);
    expect(status).toHaveBeenCalledWith(500);
    const body = (
      json.mock.calls[0] as [{ error: { code: string; message: string } }]
    )[0];
    expect(body.error.code).toBe('INTERNAL_ERROR');
    expect(JSON.stringify(body)).not.toContain('secret');
  });
});

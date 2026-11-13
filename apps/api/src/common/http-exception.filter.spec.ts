import {
  ArgumentsHost,
  BadRequestException,
  Logger,
  NotFoundException,
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

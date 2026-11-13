import { EnvValidationError, loadEnv } from './env';

const valid = {
  DATABASE_URL: 'postgres://user:secret-pw@localhost:5433/shop',
  REDIS_URL: 'redis://localhost:6379',
};

describe('loadEnv', () => {
  it('accepts a valid environment and applies defaults', () => {
    const env = loadEnv(valid);
    expect(env.NODE_ENV).toBe('development');
    expect(env.PORT).toBe(3000);
    expect(env.LOG_LEVEL).toBe('info');
  });

  it('coerces PORT from a string', () => {
    expect(loadEnv({ ...valid, PORT: '8080' }).PORT).toBe(8080);
  });

  it('names every missing variable', () => {
    try {
      loadEnv({});
      fail('expected an error');
    } catch (err) {
      expect(err).toBeInstanceOf(EnvValidationError);
      const message = (err as Error).message;
      expect(message).toContain('DATABASE_URL');
      expect(message).toContain('REDIS_URL');
    }
  });

  it('rejects a non-postgres database URL', () => {
    expect(() =>
      loadEnv({ ...valid, DATABASE_URL: 'mysql://localhost/shop' }),
    ).toThrow(/DATABASE_URL/);
  });

  it('rejects an out-of-range port', () => {
    expect(() => loadEnv({ ...valid, PORT: '70000' })).toThrow(/PORT/);
  });

  it('never puts variable values in the error message', () => {
    try {
      loadEnv({ ...valid, REDIS_URL: 'not a url secret-pw' });
      fail('expected an error');
    } catch (err) {
      expect((err as Error).message).not.toContain('secret-pw');
    }
  });
});

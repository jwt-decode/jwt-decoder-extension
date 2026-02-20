import { JWTConfig, JWTProcessor } from '../jwt-panel.js';

describe('JWTProcessor', () => {
  const validHeader = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const validPayload = btoa(JSON.stringify({ sub: '123', iat: 1700000000, exp: 2000000000 }));
  const validToken = `${validHeader}.${validPayload}.sig`;

  test('validates a well-formed JWT token', () => {
    expect(JWTProcessor.validateToken(validToken)).toEqual({
      valid: true,
      token: validToken
    });
  });

  test('rejects invalid token formats', () => {
    expect(JWTProcessor.validateToken('')).toEqual({
      valid: false,
      error: 'Invalid token format'
    });
    expect(JWTProcessor.validateToken('abc.def')).toEqual({
      valid: false,
      error: 'JWT token must have exactly 3 parts separated by dots'
    });
  });

  test('decodes header and payload for valid token', () => {
    const result = JWTProcessor.decodeToken(validToken);

    expect(result.success).toBe(true);
    expect(result.header).toEqual({ alg: 'HS256', typ: 'JWT' });
    expect(result.payload).toEqual({ sub: '123', iat: 1700000000, exp: 2000000000 });
  });

  test('returns decode error for non-json token parts', () => {
    const result = JWTProcessor.decodeToken('YWJj.ZGVm.sig');

    expect(result.success).toBe(false);
    expect(result.error).toContain('Failed to decode JWT token');
  });

  test('extracts token from headers with case-insensitive header name and matching prefix', () => {
    const config = {
      header_name: 'authorization',
      header_prefix: ['Bearer ', 'JWT '],
      allow_empty_prefix: false
    };

    expect(
      JWTProcessor.extractTokenFromHeader(
        { name: 'Authorization', value: `Bearer ${validToken}` },
        config
      )
    ).toEqual({ prefix: 'Bearer ', token: validToken });

    expect(
      JWTProcessor.extractTokenFromHeader(
        { name: 'authorization', value: `JWT ${validToken}` },
        config
      )
    ).toEqual({ prefix: 'JWT ', token: validToken });
  });

  test('does not extract token for mismatched prefix unless empty prefixes are allowed', () => {
    const config = {
      header_name: 'authorization',
      header_prefix: ['Bearer '],
      allow_empty_prefix: false
    };

    expect(
      JWTProcessor.extractTokenFromHeader(
        { name: 'Authorization', value: `Token ${validToken}` },
        config
      )
    ).toBeNull();

    expect(
      JWTProcessor.extractTokenFromHeader(
        { name: 'Authorization', value: validToken },
        { ...config, allow_empty_prefix: true }
      )
    ).toEqual({ prefix: '', token: validToken });
  });

  test('extracts token from manual input with and without prefix', () => {
    const config = { header_prefix: ['Bearer ', 'JWT '] };

    expect(JWTProcessor.extractTokenFromInput(`Bearer ${validToken}`, config)).toEqual({
      prefix: 'Bearer ',
      token: validToken
    });

    expect(JWTProcessor.extractTokenFromInput(validToken, config)).toEqual({
      prefix: '',
      token: validToken
    });
  });
});

describe('JWTConfig', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="waiting-for-request"></div>';
    global.chrome = {
      i18n: {
        getMessage: jest.fn((key, values = []) => `${key}:${values.join('|')}`)
      }
    };
  });

  test('normalizes options and prefixes with trailing spaces', () => {
    const config = new JWTConfig();

    config.setOptions({
      header_name: ' Authorization ',
      header_prefix: 'Bearer,JWT',
      copy_prefix: true,
      allow_empty_prefix: false
    });

    expect(config.getOptions()).toEqual({
      header_name: 'authorization',
      header_prefix: ['Bearer ', 'JWT '],
      copy_prefix: true,
      allow_empty_prefix: false
    });
  });

  test('uses no-prefix waiting message when allow_empty_prefix is true and no prefix configured', () => {
    const config = new JWTConfig();

    config.setOptions({
      header_name: 'Authorization',
      header_prefix: '',
      copy_prefix: false,
      allow_empty_prefix: true
    });

    expect(global.chrome.i18n.getMessage).toHaveBeenCalledWith(
      'waitingForRequestNoPrefix',
      ['Authorization']
    );

    expect(document.getElementById('waiting-for-request').innerHTML).toContain('waitingForRequestNoPrefix');
  });
});

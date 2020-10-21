import fastify, {FastifyInstance} from 'fastify';
import cookiePlugin from 'fastify-cookie';
import {callback as rawPluginCallback, csrfPlugin} from 'src/plugin';

describe('Plugin options', () => {
  let server: FastifyInstance;
  const secret = {secret: 'some secret'};
  const mockNextFn = () => undefined;

  beforeAll(async () => {
    server = fastify();
    await server.ready();
  });

  afterAll(async () => {
    await server.close();
  });

  it('Errors on non-string `secret`', () => {
    expect(() => {
      // @ts-expect-error no secret
      rawPluginCallback(server, {}, mockNextFn);
    }).toThrow();

    expect(() => {
      // @ts-expect-error secret not a string
      rawPluginCallback(server, {secret: {badSecret: 42}}, mockNextFn);
    }).toThrow();
  });

  it('Errors on non-string `tokenKey`', () => {
    expect(() => {
      // @ts-expect-error tokenKey not a string
      rawPluginCallback(server, {...secret, tokenKey: 42}, mockNextFn);
    }).toThrow();
  });

  it('Errors on non-string `checksumKey`', () => {
    expect(() => {
      // @ts-expect-error checksumKey not a string
      rawPluginCallback(server, {...secret, tokenKey: 42}, mockNextFn);
    }).toThrow();
  });

  it('Errors on non-array `ignoreMethods`', () => {
    expect(() => {
      // @ts-expect-error ignoreMethods not an array
      rawPluginCallback(server, {...secret, ignoreMethods: 42}, mockNextFn);
    }).toThrow();
  });

  it('Errors on non-boolean `validateOnRequest`', () => {
    expect(() => {
      // @ts-expect-error validateOnRequest not a boolean
      rawPluginCallback(server, {...secret, validateOnRequest: {}}, mockNextFn);
    }).toThrow();
  });

  it('Errors on non-object `cookie`', () => {
    expect(() => {
      // @ts-expect-error cookie not an object
      rawPluginCallback(server, {...secret, cookie: [{what: '?'}]}, mockNextFn);
    }).toThrow();
  });
});

describe('Plugin functionality', () => {
  type Cookie = {
    name: string;
    value: string;
    path: string;
    httpOnly?: boolean;
    sameSite: string;
  };

  let server: FastifyInstance;
  const success = {success: true};

  beforeAll(async () => {
    server = fastify();
    server.register(cookiePlugin);
    server.register(csrfPlugin, {secret: 'very cool secret'});
    server.post('/', async (req, reply) => success);
    server.get('/', async (req, reply) => success);
    await server.ready();
  });

  afterAll(async () => {
    await server.close();
  });

  it('Sets token and checksum cookies on bad request', async () => {
    // No headers provided
    const response = await server.inject({
      method: 'POST',
      url: '/',
    });
    const cookies = response.cookies as Cookie[];
    expect(response.statusCode).toEqual(400);
    expect(cookies).toHaveLength(2);

    const tokenIndex = cookies.findIndex((cookie) => cookie.name === 'csrfToken');
    expect(tokenIndex).toBeGreaterThan(-1);

    const checksumIndex = cookies.findIndex((cookie) => cookie.name === 'csrfChecksum');
    expect(checksumIndex).toBeGreaterThan(-1);
    expect(cookies[checksumIndex].httpOnly).toEqual(true); // Ensure checksum is httpOnly
  });

  it('Disregards bad tokens for ignored HTTP methods', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/',
      headers: {
        'x-csrf-token': 'very bad token value',
      },
    });
    expect(response.statusCode).toEqual(200);
    expect(response.json()).toStrictEqual(success);
  });

  it('Rejects the request when a bad token is provided', async () => {
    const response = await server.inject({
      method: 'POST',
      url: '/',
      headers: {
        'x-csrf-token': 'bad token value lol',
      },
    });
    expect(response.statusCode).toEqual(400);
  });

  it('Resolves the request when a good token is provided', async () => {
    // Send bad response first to receive good token
    const badResponse = await server.inject({
      method: 'POST',
      url: '/',
    });
    const cookies = badResponse.cookies as Cookie[];
    const tokenCookie = cookies.find((c) => c.name === 'csrfToken');
    const checksumCookie = cookies.find((c) => c.name === 'csrfChecksum');

    if (!tokenCookie || !checksumCookie) {
      throw new Error('No token or checksum found on injected response, this should never occur.');
    }

    const goodResponse = await server.inject({
      method: 'POST',
      url: '/',
      headers: {
        'x-csrf-token': tokenCookie.value,
      },
      cookies: {
        csrfToken: tokenCookie.value,
        csrfChecksum: checksumCookie.value,
      },
    });
    expect(goodResponse.statusCode).toEqual(200);
    expect(goodResponse.json()).toStrictEqual(success);
  });
});

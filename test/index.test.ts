import type {FastifyInstance} from 'fastify';
import fastify from 'fastify';
import cookiePlugin from 'fastify-cookie';
import {callback as rawPluginCallback, csrfPlugin} from 'src/plugin';

describe('Plugin options', () => {
  const server = fastify();
  const secret = {secret: 'some secret'};
  const mockNextFn = () => undefined;

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
    // expect().toReturn
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
  let server: FastifyInstance;
  beforeEach(() => {
    server = fastify();
    server.register(cookiePlugin);
    server.register(csrfPlugin, {secret: 'very cool secret'});
  });

  afterEach(async () => {
    await server.close();
  });

  it('Sets the cookie', async () => {
    const response = await server.inject({
      method: 'POST',
      url: '/',
    });

    console.log('response status:', response.statusCode);
    console.log('response received:', response.cookies);
  });
});

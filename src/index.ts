import assert from 'assert';
import fp from 'fastify-plugin';
import {createToken, createChecksum, verifyChecksum} from 'xsurf';
import type {FastifyPluginCallback, FastifyReply, onRequestHookHandler} from 'fastify';
import type {CsrfPluginOptions, Method} from './types';

const pluginName = 'fastify-xsurf';
const decoratorSymbol = Symbol.for(pluginName);

const plugin: FastifyPluginCallback<CsrfPluginOptions> = (fastify, options, next) => {
// Ensure only a single instance of this plugin has been registered.
  if (fastify.hasDecorator(decoratorSymbol)) {
    throw new Error(`Plugin ${pluginName} has already been registered.`);
  }
  fastify.decorate(decoratorSymbol, true);

  // Ensure options passed in are appropriate.
  assert(options.secret && typeof options.secret === 'string', 'Option `secret` must be a string.');
  if (options.ignoreMethods) {
    assert(Array.isArray(options.ignoreMethods), 'Option `ignoreMethods` must be an array.');
  }
  if (options.tokenKey) {
    assert(typeof options.tokenKey === 'string', 'Option `tokenKey` must be a string.');
  }
  if (options.checksumKey) {
    assert(typeof options.checksumKey === 'string', 'Option `checksumKey` must be a string.');
  }
  if (options.cookie) {
    assert(
      typeof options.cookie === 'object' &&
        Object.getPrototypeOf(options.cookie) === Object.prototype,
      'Option `secure` must be an object.'
    );
  }
  if (options.validateOnRequest !== undefined) {
    assert(
      typeof options.validateOnRequest === 'boolean',
      'Option `validateOnRequest` must be a boolean.'
    );
  }

  // Ignore methods that do not modify data on the server.
  const ignoreMethods = options.ignoreMethods || ['GET', 'HEAD', 'OPTIONS'];
  const csrfHeaders = ['x-csrf-token', 'csrf-token', 'xsrf-token', 'x-xsrf-token'];

  const tokenKey = options.tokenKey || 'csrfToken';
  const checksumKey = options.checksumKey || 'csrfChecksum';

  const createCsrfCookies = (reply: FastifyReply) => {
    const token = createToken();
    const checksum = createChecksum(token, options.secret);
    reply.setCookie(tokenKey, token, {
      path: '/',
      sameSite: 'strict',
      ...options.cookie,
    });
    reply.setCookie(checksumKey, checksum, {
      path: '/',
      sameSite: 'strict',
      ...options.cookie,
      httpOnly: true,
    });
  };

  const handler: onRequestHookHandler = async (request, reply) => {
    // Regardless of request type, ensure that the client has a CSRF token.
    if (!request.cookies[tokenKey] || !request.cookies[checksumKey]) {
      createCsrfCookies(reply);
    }

    // Enforce ignored methods.
    if (!request.raw.method || ignoreMethods.includes(request.raw.method as Method)) {
      return;
    }

    // Get the CSRF token from the request header.
    const checksum = request.cookies[checksumKey];
    let headerToken = '';
    for (const header of csrfHeaders) {
      const current = request.headers[header];
      if (typeof current === 'string') {
        headerToken = current;
        break;
      }
    }

    // Verify the CSRF token.
    const valid = verifyChecksum(headerToken, checksum, options.secret);
    if (!valid) {
      // Bad token, do not proceed to route handler. Set valid cookies to prevent
      // permanently broken tokens.
      createCsrfCookies(reply);
      reply.status(400);
      throw new Error(options.errorMessage ?? 'Invalid CSRF token provided.');
    }
  };

  if (options.validateOnRequest || typeof options.validateOnRequest === 'undefined') {
    fastify.addHook('onRequest', handler);
  } else {
    fastify.decorate('validateCsrf', handler);
  }

  next();
};

export const csrfPlugin = fp(plugin, {
  name: pluginName,
  fastify: '>=3.0.0',
  dependencies: ['fastify-cookie'],
});

export default csrfPlugin;
module.exports = csrfPlugin;

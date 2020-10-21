import assert from 'assert';
import fp from 'fastify-plugin';
import {createToken, createChecksum, verifyChecksum} from 'xsurf';
import type {FastifyPluginCallback, FastifyReply, onRequestHookHandler} from 'fastify';
import type {CsrfPluginOptions, Method} from './types';

const pluginName = 'fastify-xsurf';
const decoratorSymbol = Symbol.for(pluginName);

export const callback: FastifyPluginCallback<CsrfPluginOptions> = (fastify, options, next) => {
  // Ensure only a single instance of this plugin has been registered.
  if (fastify.hasDecorator(decoratorSymbol)) {
    throw new Error(`Plugin ${pluginName} has already been registered.`);
  }
  fastify.decorate(decoratorSymbol, true);

  // Ensure options passed in are appropriate.
  assert(typeof options.secret === 'string', 'Option `secret` must be a string.');
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
  const errorMessage = options.errorMessage?.toString() ?? 'Invalid CSRF token provided.';
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
    const {headers, cookies, raw} = request;
    let cookiesRecentlyCreated = false;

    // Regardless of request type, ensure that the client has a CSRF token.
    if (!cookies[tokenKey] || !cookies[checksumKey]) {
      createCsrfCookies(reply);
      cookiesRecentlyCreated = true;
    }

    // Skip checksum validation for ignored methods.
    if (!raw.method || ignoreMethods.includes(raw.method as Method)) {
      return;
    }

    // Skip checksum validation if cookies were created on an unignored method.
    if (cookiesRecentlyCreated) {
      // The request should be denied because the CSRF token was not present originally.
      reply.status(400);
      throw new Error(errorMessage);
    }

    // Get the CSRF token from the request header.
    const rawToken =
      headers['x-csrf-token'] ||
      headers['csrf-token'] ||
      headers['xsrf-token'] ||
      headers['x-xsrf-token'] ||
      '';
    const headerToken = Array.isArray(rawToken) ? rawToken[0] : rawToken;
    const checksum = cookies[checksumKey];

    // Verify the CSRF token.
    const valid = verifyChecksum(headerToken, checksum, options.secret);
    if (!valid) {
      createCsrfCookies(reply); // Set valid cookies to prevent permanently broken tokens.
      reply.status(400);
      throw new Error(errorMessage);
    }
  };

  if (options.validateOnRequest || typeof options.validateOnRequest === 'undefined') {
    fastify.addHook('onRequest', handler);
  } else {
    fastify.decorate('validateCsrf', handler);
  }

  next();
};

export const csrfPlugin = fp(callback, {
  name: pluginName,
  fastify: '>=3.0.0',
  dependencies: ['fastify-cookie'],
});

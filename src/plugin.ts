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
    throw new Error(`The plugin '${pluginName}' has already been registered!`);
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

  const ignoreMethods = options.ignoreMethods
    ? options.ignoreMethods.map((value) => value.toUpperCase())
    : ['GET', 'HEAD', 'OPTIONS'];
  const errorMessage = options.errorMessage || 'Invalid CSRF token provided.';
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

  const handler: onRequestHookHandler = async (req, reply) => {
    let cookiesRecentlyCreated = false;

    // Regardless of request type, ensure that the client has a CSRF token.
    if (!req.cookies[tokenKey] || !req.cookies[checksumKey]) {
      createCsrfCookies(reply);
      cookiesRecentlyCreated = true;
    }

    // Skip checksum validation for ignored methods.
    if (!req.raw.method || ignoreMethods.includes(req.raw.method as Method)) {
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
      req.headers['csrf-token'] ||
      req.headers['xsrf-token'] ||
      req.headers['x-csrf-token'] ||
      req.headers['x-xsrf-token'] ||
      '';
    const tokenAttempt = Array.isArray(rawToken) ? rawToken[0] : rawToken;

    // Verify the CSRF token.
    if (!verifyChecksum(tokenAttempt, req.cookies[checksumKey], options.secret)) {
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

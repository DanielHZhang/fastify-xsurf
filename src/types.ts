import type {onRequestHookHandler} from 'fastify';
import type {CookieSerializeOptions} from 'fastify-cookie';

declare module 'fastify' {
  interface FastifyInstance {
    validateCsrf: onRequestHookHandler;
  }
}

export type Method =
  | 'GET'
  | 'HEAD'
  | 'OPTIONS'
  | 'PUT'
  | 'POST'
  | 'DELETE'
  | 'CONNECT'
  | 'TRACE'
  | 'PATCH';

export type CsrfPluginOptions = {
  /** Shared secret used to create the token checksum. */
  secret: string;
  /**
   * Methods to ignore checking for a CSRF token.
   * Defaults to `['GET', 'HEAD', 'OPTIONS']`.
   */
  ignoreMethods?: Method[];
  /** Cookie key to store the CSRF token. Default: `csrfToken`. */
  tokenKey?: string;
  /** Cookie key to store the token checksum. Default: `csrfChecksum`. */
  checksumKey?: string;
  /**
   * Error message that will be sent in response to the client with invalid tokens.
   * Default: `Invalid CSRF token provided.`
   */
  errorMessage?: string;
  /**
   * Cookie options from `fastify-cookie`. Will override defaults
   * on both the token and checksum cookies.
   */
  cookie?: CookieSerializeOptions;
  /**
   * Validate CSRF tokens on all requests. If set to `false`, a validate function is
   * exposed at the property `fastify.validateCsrf`. Default: `true`.
   */
  validateOnRequest?: boolean;
};

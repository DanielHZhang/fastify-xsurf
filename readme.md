# fastify-xsurf

[![NPM Version][npm-version-image]][npm-url]
[![Node.js Version][node-image]][node-url]
[![NPM Downloads][npm-downloads-image]][npm-url]
[![Node.js CI][ci-image]][ci-url]

A plugin for [Fastify][fastify-url] that adds CSRF protection to HTTP routes.

This plugin uses [xsurf][xsurf-url] for generating CSRF tokens and their respective checksums. The anti-CSRF protection scheme follows [this specification][spec-url].

### Installation

Via **npm**:

```
npm i fastify-xsurf
```

Via **yarn**:

```
yarn add fastify-xsurf
```

## Usage API

This plugin does not decorate fastify's `request` or `reply` with new methods.

To validate CSRF tokens for all routes, simply register the plugin once after `fastify-cookie`. Only the routes using the HTTP methods specified in `options.ignoredMethods` will be excluded from validation.

With CommonJS `require` syntax:

```typescript
fastify.register(require('fastify-cookie'));
fastify.register(require('fastify-xsurf'), {
  /*...options */
});
```

With ES module `import` syntax:

```typescript
import cookiePlugin from 'fastify-cookie';
// Default import...
import csrfPlugin from 'fastify-xsurf';
// ... or named import
import {csrfPlugin} from 'fastify-xsurf';

fastify.register(cookiePlugin);
fastify.register(csrfPlugin, {
  /* ...options */
});
```

To validate CSRF tokens on only specific routes, set `validateOnRequest: false` on the options object:

```typescript
fastify.register(csrfPlugin, {
  validateOnRequest: false,
});
```

A validate function will then be exposed at the property `fastify.validateCsrf`, which can be called on individual `onRequest` hooks:

```typescript
fastify.route({
  method: 'POST',
  path: '/',
  onRequest: async (req, reply) => {
    fastify.validateCsrf(req, reply);
    /* ...other onRequest hook handlers */
  }
  handler: async (req, reply) => {
    // ...route handler
  }
})
```

## Options (object)

_Typescript users: options type is exported as `CsrfPluginOptions`._

### `options.secret` (string)

Shared secret used to create the token checksum.

### `options.validateOnRequest` (boolean)

Validate CSRF tokens on all requests to the server. If set to `false`, a validate function is exposed at the property `fastify.validateCsrf`, which can be called on an individual route's `onRequest` hook.

- Optional
- Default: `true`

### `options.ignoreMethods` (string[])

Methods to ignore checking for a CSRF token.

- Optional
- Default: `['GET', 'HEAD', 'OPTIONS']`

### `options.tokenKey` (string)

Cookie key to store the CSRF token.

- Optional
- Default: `'csrfToken'`

### `options.checksumKey` (string)

Cookie key to store the token checksum. Defaults to `'csrfChecksum'`

- Optional
- Default: `'csrfChecksum'`

### `options.errorMessage` (string)

Error message that will be sent in response to the client with invalid tokens.

- Optional
- Default: `'Invalid CSRF token provided.'`

### `options.cookie` (object)

Cookie options from `fastify-cookie`. Will override defaults on both the token and checksum cookies.

- Optional
- See [CookieSerializeOptions][cookie-serialize-url] from `fastify-cookie`.
- Default:

```javascript
// csrfToken cookie
{
  path: '/',
  sameSite: 'strict',
}

// csrfChecksum cookie
{
  path: '/',
  sameSize: 'strict',
  httpOnly: true,
}
```

## License

[MIT License][mit-url]

[ci-image]: https://github.com/DanielHZhang/fastify-xsurf/workflows/build-test/badge.svg
[ci-url]: https://github.com/DanielHZhang/fastify-xsurf/workflows/build-test
[node-image]: https://badgen.net/npm/node/fastify-xsurf
[node-url]: https://nodejs.org/en/download
[npm-downloads-image]: https://badgen.net/npm/dm/fastify-xsurf
[npm-url]: https://npmjs.org/package/fastify-xsurf
[npm-version-image]: https://badgen.net/npm/v/fastify-xsurf
[fastify-url]: https://fastify.io/
[xsurf-url]: https://github.com/DanielHZhang/xsurf
[spec-url]: https://github.com/xing/cross-application-csrf-prevention
[mit-url]: https://github.com/DanielHZhang/fastify-xsurf/blob/main/license.md
[cookie-serialize-url]: https://github.com/fastify/fastify-cookie/blob/master/plugin.d.ts#L46

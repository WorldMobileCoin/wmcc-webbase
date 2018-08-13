'use strict';

const Assert = require('assert');

let Crypto = null;

/**
 * Basic auth middleware.
 * @param {Object} options`
 * @returns {Function}
 */
function BasicAuth(options) {
  Assert(options, 'Basic auth requires options.');

  const hash = options.hash || sha256;
  Assert(typeof hash === 'function');

  let userHash = null;
  let passHash = null;
  let realm = 'server';

  if (options.username != null) {
    Assert(typeof options.username === 'string');
    Assert(options.username.length <= 255, 'Username too long.');
    Assert(isAscii(options.username), 'Username must be ASCII.');
    userHash = hash(Buffer.from(options.username, 'ascii'));
  }

  Assert(typeof options.password === 'string');
  Assert(options.password.length <= 255, 'Password too long.');
  Assert(isAscii(options.password), 'Password must be ASCII.');
  passHash = hash(Buffer.from(options.password, 'ascii'));

  if (options.realm != null) {
    Assert(typeof options.realm === 'string');
    realm = options.realm;
  }

  return async (req, res) => {
    const hdr = req.headers['authorization'];

    if (!hdr) {
      fail(res, realm);
      return;
    }

    if (hdr.length > 690) {
      fail(res, realm);
      return;
    }

    const parts = hdr.split(' ');

    if (parts.length !== 2) {
      fail(res, realm);
      return;
    }

    const [type, credentials] = parts;

    if (type !== 'Basic') {
      fail(res, realm);
      return;
    }

    const auth = unbase64(credentials);
    const items = auth.split(':');

    const username = items.shift();
    const password = items.join(':');

    const user = Buffer.from(username, 'ascii');
    const pass = Buffer.from(password, 'ascii');

    if (userHash) {
      if (user.length > 255) {
        fail(res, realm);
        return;
      }

      if (!ccmp(hash(user), userHash)) {
        fail(res, realm);
        return;
      }
    }

    if (pass.length > 255) {
      fail(res, realm);
      return;
    }

    if (!ccmp(hash(pass), passHash)) {
      fail(res, realm);
      return;
    }

    req.username = username;
  };
};

/*
 * Helpers
 */
function isAscii(str) {
  return typeof str === 'string' && /^[\t\n\r -~]*$/.test(str);
}

function fail(res, realm) {
  res.setStatus(401);
  res.setHeader('WWW-Authenticate', `Basic realm="${realm}"`);
  res.end();
}

function unbase64(str) {
  return Buffer.from(str, 'base64').toString('ascii');
}

function sha256(data) {
  if (!Crypto)
    Crypto = require('crypto');

  return Crypto.createHash('sha256').update(data).digest();
}

function ccmp(a, b) {
  if (b.length === 0)
    return a.length === 0;

  let res = a.length ^ b.length;

  for (let i = 0; i < a.length; i++)
    res |= a[i] ^ b[i % b.length];

  return res === 0;
}

/*
 * Expose
 */
module.exports = BasicAuth;
'use strict';

const Assert = require('assert');
const {StringDecoder} = require('string_decoder');

/**
 * Body parser middleware.
 * @param {Object} options
 * @returns {Function}
 */
function BodyParser(options) {
  const opt = new BodyParserOptions(options);

  return async (req, res) => {
    if (req.hasBody)
      return;

    try {
      req.resume();
      req.body = await parseBody(req, opt);
    } finally {
      req.pause();
    }

    req.hasBody = true;
  };
}

/**
 * Parse request body.
 * @private
 * @param {ServerRequest} req
 * @param {Object} options
 * @returns {Promise}
 */
async function parseBody(req, options) {
  if (req.method === 'GET')
    return Object.create(null);

  const type = options.type || req.type;

  switch (type) {
    case 'json': {
      const data = await readBody(req, options);

      if (!data)
        return Object.create(null);

      const body = JSON.parse(data);

      if (!body || typeof body !== 'object')
        throw new Error('JSON body must be an object.');

      return body;
    }
    case 'form': {
      const data = await readBody(req, options);

      if (!data)
        return Object.create(null);

      return parseForm(data, options.keyLimit);
    }
    default: {
      return Object.create(null);
    }
  }
}

/**
 * Read and buffer request body.
 * @param {ServerRequest} req
 * @param {Object} options
 * @returns {Promise}
 */
function readBody(req, options) {
  return new Promise((resolve, reject) => {
    return bufferBody(req, options, resolve, reject);
  });
}

/**
 * Read and buffer request body.
 * @private
 * @param {ServerRequest} req
 * @param {Object} options
 * @param {Function} resolve
 * @param {Function} reject
 */
function bufferBody(req, options, resolve, reject) {
  const decode = new StringDecoder('utf8');

  let hasData = false;
  let total = 0;
  let body = '';
  let timer = null;

  const cleanup = () => {
    /* eslint-disable */
    req.removeListener('data', onData);
    req.removeListener('error', onError);
    req.removeListener('end', onEnd);

    if (timer != null) {
      clearTimeout(timer);
      timer = null;
    }
    /* eslint-enable */
  };

  const onData = (data) => {
    total += data.length;
    hasData = true;

    if (total > options.bodyLimit) {
      reject(new Error('Request body overflow.'));
      return;
    }

    body += decode.write(data);
  };

  const onError = (err) => {
    cleanup();
    reject(err);
  };

  const onEnd = () => {
    cleanup();

    if (hasData) {
      resolve(body);
      return;
    }

    resolve(null);
  };

  timer = setTimeout(() => {
    cleanup();
    reject(new Error('Request body timed out.'));
  }, options.timeout);

  req.on('data', onData);
  req.on('error', onError);
  req.on('end', onEnd);
}

function parseForm(str, limit) {
  Assert((limit >>> 0) === limit);

  const parts = str.split('&');
  const data = Object.create(null);

  if (parts.length > limit)
    throw new Error('Too many keys in querystring.');

  for (const pair of parts) {
    const index = pair.indexOf('=');

    let key, value;
    if (index === -1) {
      key = pair;
      value = '';
    } else {
      key = pair.substring(0, index);
      value = pair.substring(index + 1);
    }

    key = unescape(key);

    if (key.length === 0)
      continue;

    value = unescape(value);

    if (value.length === 0)
      continue;

    data[key] = value;
  }

  return data;
}

class BodyParserOptions {
   constructor(options) {
    this.keyLimit = 100;
    this.bodyLimit = 20 << 20;
    this.type = null;
    this.timeout = 10 * 1000;

    if (options)
      this.fromOptions(options);
  }

  fromOptions(options) {
    Assert(options);

    if (options.keyLimit != null) {
      Assert(typeof options.keyLimit === 'number');
      this.keyLimit = options.keyLimit;
    }

    if (options.bodyLimit != null) {
      Assert(typeof options.bodyLimit === 'number');
      this.bodyLimit = options.bodyLimit;
    }

    if (options.type != null) {
      Assert(typeof options.type === 'string');
      this.type = options.type;
    }

    return this;
  }
}

/*
 * Expose
 */

module.exports = BodyParser;
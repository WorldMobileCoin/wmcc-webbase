'use strict';

const Assert = require('assert');
const Events = require('events');
const FS = require('fs');
const QS = require('querystring');

const Mime = require('./mime');

/*
 * Constants
 */
const FIELD_REGEX = /^[\u0009\u0020-\u007e\u0080-\u00ff]+$/;

/**
 * Response
 */
class Response extends Events {
  constructor(req, res) {
    super();

    this.req = req;
    this.res = res;
    this.sent = false;
    this.readable = false;
    this.writable = true;
    this.statusCode = 200;
    this.res.statusCode = 200;
    this.userId = null;
    this._auth = false;

    if (req)
      this.init(req, res);
  }

  init(req, res) {
    Assert(req);
    Assert(res);

    res.on('error', (err) => {
      this.emit('error', err);
    });

    res.on('drain', () => {
      this.emit('drain');
    });

    res.on('close', () => {
      this.emit('close');
    });

    res.on('finish', () => {
      this.emit('finish');
    });
  }

  setStatus(code) {
    Assert((code & 0xffff) === code, 'Code must be a number.');
    this.statusCode = code;
    this.res.statusCode = code;
    return this;
  }

  setType(type) {
    this.setHeader('Content-Type', Mime.type(type));
    return this;
  }

  setLength(length) {
    Assert(Number.isSafeInteger(length) && length >= 0);
    this.setHeader('Content-Length', length.toString(10));
    return this;
  }

  setCookie(key, value, options) {
    this.setHeader('Set-Cookie', this._encodeCookie(key, value, options));
    return this;
  }

  destroy() {
    this.res.destroy();
    return this;
  }

  setHeader(key, value) {
    this.res.setHeader(key, value);
    return this;
  }

  getHeader(key) {
    this.res.getHeader(key);
    return this;
  }

  read(stream) {
    Assert(!this.sent, 'Request already sent.');
    stream.pipe(this.res);
    stream.once('data', () => {
      this.sent = true;
    });
    return this;
  }

  write(data, enc) {
    Assert(!this.sent, 'Request already sent.');
    return this.res.write(data, enc);
  }

  setId(id) {
    this.userId = id;
  }

  setAuth(boolean) {
    this._auth = boolean;
  }

  isAuth() {
    return this._auth;
  }

  end(data, enc) {
    Assert(!this.sent, 'Request already sent.');
    this.sent = true;
    return this.res.end(data, enc);
  }

  redirect(code, path) {
    if (!path) {
      path = code;
      code = 303;
    }

    Assert((code & 0xffff) === code);
    Assert(typeof path === 'string');

    const req = this.req;

    if (req.headers.host && path.indexOf('://') === -1) {
      if (path.length > 0 && path[0] === '/')
        path = path.substring(1);

      const proto = req.socket.encrypted ? 'https' : 'http';
      const host = req.headers.host;
      const port = req.socket.localPort;

      let hostname = host;

      if ((!req.socket.encrypted && port !== 80)
          || (req.socket.encrypted && port !== 443)) {
        hostname += `:${port}`;
      }

      path = `${proto}://${hostname}/${path}`;
    }

    if (code === 303 && req.httpVersionMinor < 1)
      code = 302;

    this.setStatus(code);
    this.setHeader('Location', path);
    this.end();

    return this;
  }

  text(code, msg) {
    if (msg == null)
      return this.send(code, null, 'txt');
    Assert(typeof msg === 'string');
    return this.send(code, msg, 'txt');
  }

  buffer(code, msg) {
    if (msg == null)
      return this.send(code, null, 'bin');
    Assert(Buffer.isBuffer(msg));
    return this.send(code, msg, 'bin');
  }

  json(code, json) {
    if (json == null)
      return this.send(code, null, 'json');
    Assert(json && typeof json === 'object');
    const msg = JSON.stringify(json, null, 2) + '\n';
    return this.send(code, msg, 'json');
  }

  form(code, data) {
    if (data == null)
      return this.send(code, null, 'form');
    Assert(data && typeof data === 'object');
    const msg = QS.stringify(data) + '\n';
    return this.send(code, msg, 'form');
  }

  html(code, msg) {
    if (msg == null)
      return this.send(code, null, 'html');
    Assert(typeof msg === 'string');
    return this.send(code, msg, 'html');
  }

  send(code, msg, type) {
    this.setStatus(code);

    if (type)
      this.setType(type);

    if (msg == null) {
      this.setLength(0);
      try {
        this.end();
      } catch (e) {
        ;
      }
      return this;
    }

    if (typeof msg === 'string') {
      const len = Buffer.byteLength(msg, 'utf8');

      this.setLength(len);

      try {
        if (this.req.method !== 'HEAD')
          this.write(msg, 'utf8');
        this.end();
      } catch (e) {
        ;
      }

      return this;
    }

    Assert(Buffer.isBuffer(msg));

    this.setLength(msg.length);

    try {
      if (this.req.method !== 'HEAD')
        this.write(msg);
      this.end();
    } catch (e) {
      ;
    }

    return this;
  }

  sendFile(file) {
    return new Promise((resolve, reject) => {
      FS.stat(file, (err, stat) => {
        if (err) {
          reject(err);
          return;
        }
        this._sendFile(file, stat, resolve, reject);
      });
    });
  }

  _sendFile(file, stat, resolve, reject) {
    if (stat.isDirectory()) {
      const err = new Error('File not found.');
      err.statusCode = 404;
      reject(err);
      return;
    }

    if (!stat.isFile()) {
      const err = new Error('Cannot access file.');
      err.statusCode = 403;
      reject(err);
      return;
    }

    this.setStatus(200);
    this.setType(Mime.file(file));
    this.setLength(stat.size);

    const hdr = this.req.headers['content-range'];

    let options = null;

    try {
      options = this._parseRange(hdr, stat.size);
    } catch (e) {
      reject(e);
      return;
    }

    if (this.req.method === 'HEAD') {
      this.end();
      resolve();
      return;
    }

    const stream = FS.createReadStream(file, options);

    let done = false;

    this.once('close', () => {
      if (done)
        return;
      done = true;
      stream.destroy();
      resolve();
    });

    this.once('finish', () => {
      if (done)
        return;
      done = true;
      resolve();
    });

    stream.on('error', (err) => {
      if (done)
        return;
      done = true;
      stream.destroy();
      reject(err);
    });

    this.read(stream);
  }

  _encodeCookie(key, value, options) {
    if (options == null)
      options = {};

    Assert(typeof key === 'string');
    Assert(typeof value === 'string');
    Assert(options && typeof options === 'object');

    if (!FIELD_REGEX.test(key))
      throw new Error('Invalid cookie name.');

    const val = encodeURIComponent(value);

    if (!FIELD_REGEX.test(val))
      throw new Error('Invalid cookie value.');

    let str = `${key}=${val}`;

    if (options.maxAge != null) {
      Assert((options.maxAge >>> 0) === options.maxAge);
      str += `; Max-Age=${options.maxAge}`;
    }

    if (options.domain != null) {
      Assert(typeof options.domain === 'string');
      if (!FIELD_REGEX.test(options.domain))
        throw new Error('Invalid domain.');
      str += `; Domain=${options.domain}`;
    }

    if (options.path != null) {
      Assert(typeof options.path === 'string');
      if (!FIELD_REGEX.test(options.path))
        throw new Error('Invalid path.');
      str += `; Path=${options.path}`;
    }

    if (options.expires != null) {
      Assert(Number.isSafeInteger(options.expires) && options.expires >= 0);
      const expires = new Date(options.expires);
      str += `; Expires=${expires.toUTCString()}`;
    }

    if (options.httpOnly)
      str += '; HttpOnly';

    if (options.secure)
      str += '; Secure';

    if (options.sameSite != null) {
      if (typeof options.sameSite === 'boolean') {
        if (options.sameSite)
          str += '; SameSite=Strict';
      } else {
        Assert(typeof options.sameSite === 'string');
        switch (options.sameSite) {
          case 'strict':
            str += '; SameSite=Strict';
            break;
          case 'lax':
            str += '; SameSite=Lax';
            break;
          default:
            throw new Error('Unknown same site option.');
        }
      }
    }

    return str;
  }

  _rangeError() {
    const err = new Error('Invalid range.');
    err.statusCode = 416;
    return err;
  }

  _parseRange(hdr, size) {
    if (!hdr)
      return null;

    if (!/^ *bytes=/.test(hdr))
      throw this._rangeError();

    const index = hdr.indexOf('=');
    Assert(index !== -1);

    const parts = hdr.substring(index + 1).split(',');
    const ranges = [];

    for (const part of parts) {
      const range = part.trim();
      const items = range.split('-');

      if (items.length < 2)
        items.push('');

      const left = items[0].trim();
      const right = items[1].trim();

      let start = 0;
      let end = size;

      if (left.length === 0) {
        end = parseInt(right, 10);
      } else if (right.length === 0) {
        start = parseInt(left, 10);
      } else {
        start = parseInt(left, 10);
        end = parseInt(right, 10);
      }

      if (!Number.isSafeInteger(start) || start < 0
          || !Number.isSafeInteger(end) || end < 0
          || start > end) {
        throw this._rangeError();
      }

      ranges.push({ start, end });
    }

    if (ranges.length === 0)
      throw this._rangeError();

    return ranges[0];
  }
}

/**
 * Expose
 */
module.exports = Response;
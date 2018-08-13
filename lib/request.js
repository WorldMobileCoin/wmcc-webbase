'use strict';

const Assert = require('assert');
const Events = require('events');
const URL = require('url');

const Mime = require('./mime');

/**
 * Request
 */
class Request extends Events {
  constructor(req, res, url) {
    super();
    this.req = null;
    this.res = null;
    this.socket = null;
    this.method = 'GET';
    this.headers = Object.create(null);
    this.type = 'bin';
    this.url = '/';
    this.pathname = '/';
    this.path = [];
    this.trailing = false;
    this.original = null;
    this.username = null;
    this.query = Object.create(null);
    this.params = Object.create(null);
    this.body = Object.create(null);
    this.cookies = Object.create(null);
    this.hasBody = false;
    this.readable = true;
    this.writable = false;
    this.admin = false;
    this.wallet = null;
    this.init(req, res, url);
  }

  init(req, res, url) {
    Assert(req);
    Assert(res);

    this.req = req;
    this.res = res;
    this.socket = req.socket;
    this.method = req.method;
    this.headers = req.headers;
    this.type = Mime.ext(req.headers['content-type']);
    this.parse(url);

    req.on('error', (err) => {
      this.emit('error', err);
    });

    req.on('data', (data) => {
      this.emit('data', data);
    });

    req.on('end', () => {
      this.emit('end');
    });
  }

  parse(url) {
    const uri = this._parseURL(url);
    this.original = uri;
    this.url = uri.url;
    this.pathname = uri.pathname;
    this.path = uri.path;
    this.query = uri.query;
    this.trailing = uri.trailing;
  }

  navigate(url) {
    const uri = this._parseURL(url);
    this.url = uri.url;
    this.pathname = uri.pathname;
    this.path = uri.path;
    this.query = uri.query;
  }

  prefix() {
    if (this.trailing)
      return '';

    const original = this.original;

    if (this.path.length > 0)
      return this.path[this.path.length - 1] + '/';

    if (original.path.length > 0)
      return original.path[original.path.length - 1] + '/';

    return '';
  }

  pipe(dest) {
    return this.req.pipe(dest);
  }

  pause() {
    return this.req.pause();
  }

  resume() {
    return this.req.resume();
  }

  destroy() {
    return this.req.destroy();
  }

  _parseURL(uri) {
    Assert(typeof uri === 'string');

    if (uri.length > 4096)
      throw new Error('URI is too long.');

    if (!/^[a-z]+:\/\//i.test(uri))
      uri = 'http://localhost/' + uri;

    const data = URL.parse(uri);

    let pathname = data.pathname;
    let trailing = false;

    if (pathname) {
      if (pathname.length > 1024)
        throw new Error('Pathname is too long.');

      pathname = pathname.replace(/\/{2,}/g, '/');

      if (pathname[0] !== '/')
        pathname = '/' + pathname;

      if (pathname.length > 1) {
        if (pathname[pathname.length - 1] === '/') {
          pathname = pathname.slice(0, -1);
          trailing = true;
        }
      }

      pathname = pathname.replace(/%2f/gi, '');
      pathname = unescape(pathname);
    } else {
      pathname = '/';
    }

    pathname = pathname.replace(/\/\.\.?\//g, '');
    pathname = pathname.replace(/[^ -~]+/g, '');
    pathname = pathname.replace(/\\+/, '');

    Assert(pathname.length > 0);
    Assert(pathname[0] === '/');

    if (pathname.length > 1)
      Assert(pathname[pathname.length - 1] !== '/');

    let path = pathname;

    if (path[0] === '/')
      path = path.substring(1);

    path = path.split('/');

    if (path.length === 1) {
      if (path[0].length === 0)
        path = [];
    }

    let url = pathname;

    if (data.search && data.search.length > 1) {
      Assert(data.search[0] === '?');
      url += data.search;
    }

    let query = Object.create(null);

    if (data.query)
      query = this._parseForm(data.query, 100);

    return {
      url,
      pathname,
      path,
      query,
      trailing
    };
  }

  _parseForm(str, limit) {
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
}

/*
 * Expose
 */
module.exports = Request;
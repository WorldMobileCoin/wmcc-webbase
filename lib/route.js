'use strict';

const Assert = require('assert');

/**
 * Route
 */
class Route {
  constructor(path, handler) {
    Assert(typeof path === 'string');
    Assert(typeof handler === 'function');
    Assert(handler.length === 2 || handler.length === 3);

    this.path = path;
    this.regex = /^\/$/;
    this.handler = handler;
    this.arity = handler.length;
    this.map = [];
    this.compiled = false;
  }

  compile() {
    if (this.compiled)
      return;

    this.compiled = true;

    if (this.path === '/')
      return;

    const map = this.map;

    let path = this.path;

    path = path.replace(/(\/[^\/]+)\?/g, '(?:$1)?');
    path = path.replace(/\.(?!\+)/g, '\\.');
    path = path.replace(/\*/g, '.*?');
    path = path.replace(/%/g, '\\');

    path = path.replace(/:(\w+)/g, (str, name) => {
      map.push(name);
      return '([^/]+)';
    });

    this.regex = new RegExp('^' + path + '$');
  }

  match(pathname) {
    this.compile();

    const matches = this.regex.exec(pathname);

    if (!matches)
      return null;

    const params = Object.create(null);

    for (let i = 1; i < matches.length; i++) {
      const item = matches[i];
      const key = this.map[i - 1];

      if (key)
        params[key] = item;

      params[i - 1] = item;
    }

    return params;
  }
}

/*
 * Expose
 */
module.exports = Route;
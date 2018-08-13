'use strict';

const Assert = require('assert');

class Hook {
  constructor(path, handler) {
    Assert(typeof path === 'string');
    Assert(typeof handler === 'function' || typeof handler === 'object');
    Assert(handler !== null);

    this.path = path;
    this.handler = handler;
    this.arity = 0;

    if (typeof handler === 'function')
      this.arity = handler.length;
  }

  isPrefix(pathname) {
    if (this.path === '/')
      return true;

    if (pathname.startsWith)
      return pathname.startsWith(this.path);

    return pathname.indexOf(this.path) === 0;
  }
}

/*
 * Expose
 */
module.exports = Hook;
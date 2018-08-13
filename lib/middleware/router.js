'use strict';

const Assert = require('assert');

/**
 * Router middleware.
 * @returns {Function}
 */
function Router(routes) {
  Assert(routes && typeof routes === 'object');
  Assert(typeof routes.handle === 'function');
  return async (req, res) => {
    return routes.handle(req, res);
  };
}

/*
 * Expose
 */
module.exports = Router;
'use strict';

/**
 * CORS middleware.
 * @returns {Function}
 */
function CORS() {
  return async (req, res) => {
    const origin = req.headers.origin != null
      ? req.headers.origin
      : '*';

    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader(
      'Access-Control-Allow-Methods',
      'GET,HEAD,PUT,PATCH,POST,DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Authorization');

    if (req.method === 'OPTIONS') {
      res.setStatus(200);
      res.end();
      return;
    }
  };
}

/*
 * Expose
 */
module.exports = CORS;
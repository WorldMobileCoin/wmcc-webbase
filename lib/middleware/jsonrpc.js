'use strict';

const Assert = require('assert');

/**
 * JSON rpc middleware.
 * @param {Object} rpc
 * @returns {Function}
 */
function JsonRPC(rpc) {
  Assert(rpc && typeof rpc === 'object');
  Assert(typeof rpc.call === 'function');

  return async (req, res) => {
    if (req.method !== 'POST')
      return;

    if (req.pathname !== '/')
      return;

    if (typeof req.body.method !== 'string')
      return;

    let json = await rpc.call(req.body, req.query);

    if (json == null)
      json = null;

    json = JSON.stringify(json);
    json += '\n';

    res.setHeader('X-Long-Polling', '/?longpoll=1');

    res.send(200, json, 'application/json');
  };
}

/*
 * Expose
 */
module.exports = JsonRPC;
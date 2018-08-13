'use strict';

const Assert = require('assert');
const Events = require('events');

/**
 * JSON RPC
 * @extends EventEmitter
 */

class RPC extends Events {
  constructor() {
    super();

    this.calls = Object.create(null);
    this.mounts = [];
  }

  /**
   * Convert error to RPC error code.
   * @param {Error} err
   */
  getCode(err) {
    switch (err.type) {
      case 'RPCError':
        return err.code;
      default:
        return RPC.ERRORS.INTERNAL_ERROR;
    }
  }

  /**
   * Handle call (abstract).
   * @param {Object} cmd
   * @param {Object} query
   */
  handleCall(cmd, query) {}

  /**
   * Handle error (abstract).
   * @param {Error} err
   */
  handleError(err) {}

  /**
   * Execute batched RPC calls.
   * @param {Object|Object[]} body
   * @param {Object} query
   * @returns {Promise}
   */
  async call(body, query) {
    let cmds = body;
    let out = [];
    let array = true;

    if (!query)
      query = {};

    if (!Array.isArray(cmds)) {
      cmds = [cmds];
      array = false;
    }

    for (const cmd of cmds) {
      if (!cmd || typeof cmd !== 'object') {
        out.push({
          result: null,
          error: {
            message: 'Invalid request.',
            code: RPC.ERRORS.INVALID_REQUEST
          },
          id: null
        });
        continue;
      }

      if (cmd.id && typeof cmd.id === 'object') {
        out.push({
          result: null,
          error: {
            message: 'Invalid ID.',
            code: RPC.ERRORS.INVALID_REQUEST
          },
          id: null
        });
        continue;
      }

      if (cmd.id == null)
        cmd.id = null;

      if (!cmd.params)
        cmd.params = [];

      if (typeof cmd.method !== 'string') {
        out.push({
          result: null,
          error: {
            message: 'Method not found.',
            code: RPC.ERRORS.METHOD_NOT_FOUND
          },
          id: cmd.id
        });
        continue;
      }

      if (!Array.isArray(cmd.params)) {
        out.push({
          result: null,
          error: {
            message: 'Invalid params.',
            code: RPC.ERRORS.INVALID_PARAMS
          },
          id: cmd.id
        });
        continue;
      }

      this.handleCall(cmd, query);
      this.emit('call', cmd, query);

      let result;
      try {
        result = await this.execute(cmd);
      } catch (err) {
        const code = this.getCode(err);

        if (code === RPC.ERRORS.INTERNAL_ERROR) {
          this.handleError(err);
          this.emit('error', err);
        }

        out.push({
          result: null,
          error: {
            message: err.message,
            code: code
          },
          id: cmd.id
        });

        continue;
      }

      if (result === undefined)
        result = null;

      out.push({
        result: result,
        error: null,
        id: cmd.id
      });
    }

    if (!array)
      out = out[0];

    return out;
  }

  /**
   * Execute an RPC call.
   * @private
   * @param {Object} json
   * @param {Boolean} help
   * @returns {Promise}
   */
  async execute(json, help) {
    const func = this.calls[json.method];

    if (!func) {
      for (const mount of this.mounts) {
        if (mount.calls[json.method])
          return await mount.execute(json, help);
      }
      throw new RPCError(RPC.ERRORS.METHOD_NOT_FOUND,
        `Method not found: ${json.method}.`);
    }

    return func.call(this, json.params, help);
  }

  /**
   * Add an RPC call.
   * @param {String} name
   * @param {Function} func
   * @param {Object?} ctx
   */
  add(name, func, ctx) {
    Assert(typeof func === 'function', 'Handler must be a function.');
    Assert(!this.calls[name], 'Duplicate RPC call.');

    if (ctx)
      func = func.bind(ctx);

    this.calls[name] = func;
  }

  /**
   * Mount another RPC object.
   * @param {Object} rpc
   */
  mount(rpc) {
    Assert(rpc, 'RPC must be an object.');
    Assert(typeof rpc.execute === 'function', 'Execute must be a method.');
    this.mounts.push(rpc);
  }

  /**
   * Attach to another RPC object.
   * @param {Object} rpc
   */
  attach(rpc) {
    Assert(rpc, 'RPC must be an object.');
    Assert(typeof rpc.execute === 'function', 'Execute must be a method.');
    rpc.mount(this);
  }
}

/**
 * RPC Error
 * @extends Error
 */
class RPCError extends Error {
  constructor(code, msg) {
    super();

    Assert(typeof code === 'number');
    Assert(typeof msg === 'string');

    this.type = 'RPCError';
    this.message = msg;
    this.code = code;

    if (Error.captureStackTrace)
      Error.captureStackTrace(this, RPCError);
  }
}

/*
 * Expose
 */
RPC.ERRORS = {
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL_ERROR: -32603,
  PARSE_ERROR: -32700
};

RPC.RPC = RPC;
RPC.RPCError = RPCError;

module.exports = RPC;
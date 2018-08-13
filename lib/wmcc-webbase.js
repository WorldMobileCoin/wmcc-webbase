'use strict';
const Server = require('./server');
const Router = require('./router');
const {RPC, RPCError, Errors} = require('./rpc');
const Middleware = require('./middleware');

exports.Server = Server;
exports.createServer = options => new Server(options);
exports.server = options => new Server(options);

exports.Router = Router;
exports.router = () => new Router();

exports.RPC = RPC;
exports.rpc = () => new RPC();

exports.RPCError = RPCError;
exports.Errors = Errors;

exports.Middleware = Middleware;
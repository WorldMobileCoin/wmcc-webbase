'use strict';

const Path = require('path');
const WebBase = require('../');

const PORT = 8080;
const server = WebBase.server({
  port: PORT,
  sockets: true
});

server.use('/', server.bodyParser());
server.use('/', server.cookieParser());
server.use('/', server.jsonRPC());
server.use('/', server.router());
server.use('/static', server.fileServer(Path.resolve(__dirname, '..')));

server.get('/', (req, res) => {
  res.html(200, '<a href="/static">Static Directory</a>\n');
});

server.add('baz', async () => {
  return { foo: 'bar' };
});

server.on('error', (err) => {
  console.error(err.stack);
});

(async () => {
  await server.open();
  console.log(`Server running on port: ${PORT}`);
})().catch((err) => {
  console.error(err.stack);
  process.exit(0);
});
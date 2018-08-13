# wmcc-webbase (WorldMobileCoin)

__NOTE__: The first release of wmcc-webbase.

---

## WMCC WebBase

Utility for WMCC.

### Usage:
```js
const Path = require('path');
const WebBase = require('wmcc-webbase');

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
```

**WorldMobileCoin** is a new generation of cryptocurrency.

Although still in a beta state, wmcc-webbase is well tested and aware of all known
consensus rules. It is currently used in production as wallet system front-end 
for https://www.worldmobilecoin.com

## Disclaimer

WorldMobileCoin does not guarantee you against theft or lost funds due to bugs, mishaps,
or your own incompetence. You and you alone are responsible for securing your money.

## Contribution and License Agreement

If you contribute code to this project, you are implicitly allowing your code
to be distributed under the MIT license. You are also implicitly verifying that
all code is your original work.

## License

--Copyright (c) 2018, Park Alter (pseudonym)  
--Distributed under the MIT software license, see the accompanying  
--file COPYING or http://www.opensource.org/licenses/mit-license.php
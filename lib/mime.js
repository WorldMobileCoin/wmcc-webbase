'use strict';

const Assert = require('assert');

exports.TYPES = {
  'atom': ['application/atom+xml', true],
  'bin': ['application/octet-stream', false],
  'bmp': ['image/bmp', false],
  'css': ['text/css', true],
  'dat': ['application/octet-stream', false],
  'form': ['application/x-www-form-urlencoded', true],
  'gif': ['image/gif', false],
  'gz': ['application/x-gzip', false],
  'htc': ['text/x-component', true],
  'html': ['text/html', true],
  'ico': ['image/x-icon', false],
  'jpg': ['image/jpeg', false],
  'jpeg': ['image/jpeg', false],
  'js': ['application/javascript', true],
  'json': ['application/json', true],
  'log': ['text/plain', true],
  'manifest': ['text/cache-manifest', false],
  'mathml': ['application/mathml+xml', true],
  'md': ['text/plain', true],
  'mkv': ['video/x-matroska', false],
  'mml': ['application/mathml+xml', true],
  'mp3': ['audio/mpeg', false],
  'mp4': ['video/mp4', false],
  'mpeg': ['video/mpeg', false],
  'mpg': ['video/mpeg', false],
  'oga': ['audio/ogg', false],
  'ogg': ['application/ogg', false],
  'ogv': ['video/ogg', false],
  'otf': ['font/otf', false],
  'pdf': ['application/pdf', false],
  'png': ['image/png', false],
  'rdf': ['application/rdf+xml', true],
  'rss': ['application/rss+xml', true],
  'svg': ['image/svg+xml', false],
  'swf': ['application/x-shockwave-flash', false],
  'tar': ['application/x-tar', false],
  'torrent': ['application/x-bittorrent', false],
  'txt': ['text/plain', true],
  'ttf': ['font/ttf', false],
  'wav': ['audio/wav', false],
  'webm': ['video/webm', false],
  'woff': ['font/x-woff', false],
  'xhtml': ['application/xhtml+xml', true],
  'xbl': ['application/xml', true],
  'xml': ['application/xml', true],
  'xsl': ['application/xml', true],
  'xslt': ['application/xslt+xml', true],
  'zip': ['application/zip', false]
};

exports.EXTENSIONS = {
  'application/atom+xml': 'atom',
  'application/octet-stream': 'bin',
  'image/bmp': 'bmp',
  'text/css': 'css',
  'application/x-www-form-urlencoded': 'form',
  'image/gif': 'gif',
  'application/x-gzip': 'gz',
  'text/x-component': 'htc',
  'text/html': 'html',
  'image/x-icon': 'ico',
  'image/jpeg': 'jpeg',
  'text/javascript': 'js',
  'application/javascript': 'js',
  'text/x-json': 'json',
  'application/json': 'json',
  'text/plain': 'txt',
  'text/cache-manifest': 'manifest',
  'application/mathml+xml': 'mml',
  'video/x-matroska': 'mkv',
  'audio/x-matroska': 'mkv',
  'audio/mpeg': 'mp3',
  'audio/mpa': 'mp3',
  'video/mp4': 'mp4',
  'video/mpeg': 'mpg',
  'audio/ogg': 'oga',
  'application/ogg': 'ogg',
  'video/ogg': 'ogv',
  'font/otf': 'otf',
  'application/pdf': 'pdf',
  'application/x-pdf': 'pdf',
  'image/png': 'png',
  'application/rdf+xml': 'rdf',
  'application/rss+xml': 'rss',
  'image/svg+xml': 'svg',
  'application/x-shockwave-flash': 'swf',
  'application/x-tar': 'tar',
  'application/x-bittorrent': 'torrent',
  'font/ttf': 'ttf',
  'audio/wav': 'wav',
  'audio/wave': 'wav',
  'video/webm': 'webm',
  'audio/webm': 'webm',
  'font/x-woff': 'woff',
  'application/xhtml+xml': 'xhtml',
  'application/xml': 'xsl',
  'application/xslt+xml': 'xslt',
  'application/zip': 'zip'
};

exports.file = function file(path) {
  Assert(typeof path === 'string');

  const name = path.split('/').pop();
  const parts = name.split('.');

  if (parts.length < 2)
    return 'bin';

  if (parts.length === 2 && parts[0] === '')
    return 'txt';

  const ext = parts[parts.length - 1];

  if (exports.TYPES[ext])
    return ext;

  return 'bin';
};

exports.textual = function textual(ext) {
  const value = exports.TYPES[ext];

  if (!value)
    return false;

  return value[1];
};

exports.type = function type(ext) {
  Assert(typeof ext === 'string');

  if (ext.indexOf('/') !== -1)
    return ext;

  const value = exports.TYPES[ext];

  if (!value)
    return 'application/octet-stream';

  let [name, text] = value;

  if (text)
    name += '; charset=utf-8';

  return name;
};

exports.ext = function ext(type) {
  if (type == null)
    return 'bin';

  Assert(typeof type === 'string');

  [type] = type.split(';');
  type = type.toLowerCase();
  type = type.trim();

  return exports.EXTENSIONS[type] || 'bin';
};
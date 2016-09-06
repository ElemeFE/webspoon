import cluster from 'cluster';
import os from 'os';
import path from 'path';
import UglifyJS from 'uglify-js';
import CleanCss from 'clean-css';
import Storage from './storage';
import crypto from 'crypto';
import argollector from 'argollector';

const cache = new Storage(argollector['--usemin-cache'] || path.join(process.env.HOME, '.webspoon'));

const compressWithoutCache = (type, code, hash) => {
  let result;
  switch(type) {
    case 'js':
      result = UglifyJS.minify(code, { fromString: true }).code;
      break;
    case 'css':
      result = new CleanCss().minify(code).styles;
      break;
    default:
      throw new Error(`Unknown type (${type}) to compress`);
  }
  if (type !== void 0) return cache.set(hash, result).then(() => result, () => result);
};

const compress = (type, code) => {
  let hash = crypto.createHash('sha1').update(type + code).digest('hex');
  return cache.get(hash).catch(() => compressWithoutCache(type, code, hash));
};

export default {
  js: compress.bind(null, 'js'),
  css: compress.bind(null, 'css')
};

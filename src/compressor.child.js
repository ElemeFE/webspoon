import UglifyJS from 'uglify-js';
import CleanCss from 'clean-css';

import Storage from './storage';

import crypto from 'crypto';

const cache = new Storage('webspoon');

const compress = message => Promise.resolve().then(() => {
  switch(message.type) {
    case 'js':
      return UglifyJS.minify(message.code, { fromString: true }).code;
    case 'css':
      return new CleanCss().minify(message.code).styles;
  }
});

process.on('message', message => {
  let hash = 'compressor-' + crypto.createHash('sha1').update(message.code).digest('hex');
  cache.getItem(hash).catch(() => {
    return compress(message).then(code => cache.setItem(hash, code).then(() => code));
  }).then(code => {
    process.send({ status: 'OK', id: message.id, code });
  }, error => {
    process.send({ status: 'ERROR', id: message.id, errorMessage: error.message });
  });
});

import UglifyJS from 'uglify-js';
import CleanCss from 'clean-css';

process.on('message', message => {
  var code;
  try {
    switch(message.type) {
      case 'js':
        code = UglifyJS.minify(message.code, { fromString: true }).code;
        break;
      case 'css':
        code = new CleanCss().minify(message.code).styles;
        break;
    }
    process.send({ status: 'OK', id: message.id, code });
  } catch(error) {
    process.send({ status: 'ERROR', id: message.id, errorMessage: error.message });
  }
});

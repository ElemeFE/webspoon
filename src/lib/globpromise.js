import glob from 'glob';
export default fileName => new Promise((resolve, reject) => {
  glob(fileName, { follow: false }, (error, list) => error ? reject(error) : resolve(list));
});

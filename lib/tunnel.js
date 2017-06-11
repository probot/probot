// eslint-disable-next-line import/no-extraneous-dependencies, import/no-unresolved
const localtunnel = require('localtunnel');

module.exports = function (subdomain, port) {
  if(subdomain !== 'string') {
    subdomain = require('os').userInfo().username;
  }

  const tunnel = localtunnel(port, {subdomain}, (err, tunnel) => {
    if (err) {
      console.warn('Could not open tunnel: ', err.message);
    } else {
      console.log('Listening on ' + tunnel.url);
    }
  });

  tunnel.on('close', () => {
    console.warn('Local tunnel closed');
  });

  return tunnel;
}

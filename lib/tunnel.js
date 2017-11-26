const https = require('https')
const localtunnel = require('localtunnel')
const logger = require('./logger')

module.exports = function setupTunnel (subdomain, port, retries = 0) {
  if (typeof subdomain !== 'string') {
    subdomain = require('os').userInfo().username.toLowerCase()
  }

  return new Promise((resolve, reject) => {
    localtunnel(port, {subdomain}, (err, tunnel) => {
      if (err) {
        reject(err)
      } else {
        testTunnel(subdomain).then(() => {
          logger.info('Listening on ' + tunnel.url)
          resolve(tunnel)
        }).catch((err) => {
          if (retries < 3) {
            logger.warn(`Could not connect to localtunnel.me. Trying again (tries: ${retries + 1})`)
            resolve(setupTunnel(subdomain, port, retries + 1))
          } else {
            logger.warn(err, 'Failed to connect to localtunnel.me.')
            reject(err)
          }
        })
      }
    })
  })
}

// When a tunnel is closed and then immediately reopened (e.g. restarting the
// server to reload changes), then localtunnel.me may connect but not pass
// requests through. This test that the tunnel returns 200 for /ping.
function testTunnel (subdomain) {
  const options = {
    host: `${subdomain}.localtunnel.me`,
    port: 443,
    path: '/ping',
    method: 'GET'
  }

  return new Promise((resolve, reject) => {
    https.request(options, res => {
      return res.statusCode === 200 ? resolve() : reject(new Error('localtunnel failed to connect'))
    }).end()
  })
}

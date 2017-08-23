const https = require('https')
// eslint-disable-next-line import/no-extraneous-dependencies, import/no-unresolved
const localtunnel = require('localtunnel')

module.exports = function setupTunnel (subdomain, port, retries = 0) {
  if (typeof subdomain !== 'string') {
    subdomain = require('os').userInfo().username
  }

  return new Promise((resolve, reject) => {
    localtunnel(port, {subdomain}, (err, tunnel) => {
      if (err) {
        reject(err)
      } else {
        testTunnel(subdomain).then(() => resolve(tunnel)).catch(() => {
          if (retries < 3) {
            console.warn(`Failed to connect to localtunnel.me. Trying again (tries: ${retries + 1})`)
            resolve(setupTunnel(subdomain, port, retries + 1))
          } else {
            reject(new Error('Failed to connect to localtunnel.me. Giving up.'))
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
      return res.statusCode === 200 ? resolve() : reject()
    }).end()
  })
}

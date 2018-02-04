// Borrowed from https://github.com/vvo/bunyan-request
// Copyright (c) Christian Tellnes <christian@tellnes.no>
var uuid = require('uuid')

module.exports = function logRequest ({logger}) {
  return function (req, res, next) {
    // Use X-Request-ID from request if it is set, otherwise generate a uuid
    req.id = req.headers['x-request-id'] ||
      req.headers['x-github-delivery'] ||
      uuid.v4()
    res.setHeader('x-request-id', req.id)

    // Make a logger available on the request
    req.log = logger.wrap().child({name: 'http', id: req.id})

    // Request started
    req.log.trace({req}, `${req.method} ${req.url}`)

    // Start the request timer
    const time = process.hrtime()

    res.on('finish', () => {
      // Calculate how long the request took
      const [seconds, nanoseconds] = process.hrtime(time)
      res.duration = (seconds * 1e3 + nanoseconds * 1e-6).toFixed(2)

      const message = `${req.method} ${req.url} ${res.statusCode} - ${res.duration} ms`

      req.log.info(message)
      req.log.trace({res})
    })

    next()
  }
}

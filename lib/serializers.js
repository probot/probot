module.exports = {
  repository: repository => repository.full_name,
  event: event => {
    if (typeof event !== 'object' || !event.payload) {
      return event
    } else {
      return {
        id: event.id,
        event: event.event,
        action: event.payload.action,
        repository: event.payload.repository && event.payload.repository.full_name
      }
    }
  },
  installation: installation => installation.account.login,

  // Same as buyan's standard serializers, but adds `body` to allow debugging
  // request parameters.
  // https://github.com/trentm/node-bunyan/blob/fe31b83e42d9c7f784e83fdcc528a7c76e0dacae/lib/bunyan.js#L1087-L1103
  req (req) {
    if (!req || !req.connection) {
      return req
    }
    return {
      method: req.method,
      url: req.url,
      body: req.body,
      headers: req.headers,
      remoteAddress: req.connection.remoteAddress,
      remotePort: req.connection.remotePort
    }
  },

  // Same as buyan's standard serializers, but gets headers as an object
  //  instead of a string.
  // https://github.com/trentm/node-bunyan/blob/fe31b83e42d9c7f784e83fdcc528a7c76e0dacae/lib/bunyan.js#L1105-L1113
  res (res) {
    if (!res || !res.statusCode) {
      return res
    }

    return {
      statusCode: res.statusCode,
      headers: res.getHeaders()
    }
  },
}

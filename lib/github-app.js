const jwt = require('jsonwebtoken')

module.exports = function ({id, cert}) {
  return function () {
    const payload = {
      iat: Math.floor(new Date() / 1000),       // Issued at time
      exp: Math.floor(new Date() / 1000) + 60,  // JWT expiration time
      iss: id                                   // GitHub App ID
    }

    // Sign with RSA SHA256
    return jwt.sign(payload, cert, {algorithm: 'RS256'})
  }
}

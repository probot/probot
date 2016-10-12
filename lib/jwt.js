const fs = require('fs');
const jwt = require('jsonwebtoken');
const process = require('process');

// sign with RSA SHA256
// FIXME: move to env var
const cert = fs.readFileSync('private-key.pem');  // get private key

module.exports = generate;

function generate () {
  var payload = {
    // issued at time
    iat: Math.floor(new Date() / 1000),
    // JWT expiration time
    exp: Math.floor(new Date() / 1000) + 60 * 5,
    // Integration's GitHub identifier
    iss: process.env.INTEGRATION_ID
  }

  return jwt.sign(payload, cert, { algorithm: 'RS256'});
}

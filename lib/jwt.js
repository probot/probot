const fs = require('fs');
const process = require('process');
const jwt = require('jsonwebtoken');

const cert = process.env.PRIVATE_KEY || fs.readFileSync('private-key.pem');

module.exports = generate;

function generate() {
  const payload = {
    // issued at time
    iat: Math.floor(new Date() / 1000),
    // JWT expiration time
    exp: Math.floor(new Date() / 1000) + 60,
    // Integration's GitHub identifier
    iss: process.env.INTEGRATION_ID
  };

  // sign with RSA SHA256
  return jwt.sign(payload, cert, {algorithm: 'RS256'});
}

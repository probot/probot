const process = require('process');
const bunyan = require('bunyan');

module.exports = bunyan.createLogger({
  name: 'PRobot',
  level: process.env.LOG_LEVEL || 'info'
});

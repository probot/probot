module.exports = ({url, port, path, logger}) => {
  try {
    const SmeeClient = require('smee-client')

    const smee = new SmeeClient({
      source: url,
      target: `http://localhost:${port}${path}`,
      logger
    })
    return smee.start()
  } catch (err) {
    logger.warn('Run `npm install --save-dev smee-client` to proxy webhooks to localhost.')
  }
}

module.exports = ({url, port, path, logger}) => {
  // function to validate the url (taken from stack-overflow)
  function validURL (str) {
    const pattern = new RegExp('^(https?:\\/\\/)?' + // protocol
  '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\. ?)+[a-z]{2,}|' + // domain name
  '((\\d{1,3}\\.){3}\\d{1,3}))' + // OR ip (v4) address
  '(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*' + // port and path
  '(\\?[;&a-z\\d%_.~+=-]*)?' + // query string
  '(\\#[-a-z\\d_]*)?$', 'i') // fragment locator
    return pattern.test(str)
  }
  try {
    var goodUrl = true // url is considered to be true
    const SmeeClient = require('smee-client')
    if (!validURL(url)) {
      goodUrl = false // url is invalid
      throw new Error('The provided Webhook Proxy URL is invalid.')
    } else {
      const smee = new SmeeClient({
        source: url,
        target: `http://localhost:${port}${path}`,
        logger
      })
      return smee.start()
    }
  } catch (err) {
    if (goodUrl) logger.warn('Run `npm install --save-dev smee-client` to proxy webhooks to localhost')
    else logger.warn(err)
  }
}

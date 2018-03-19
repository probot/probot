require('dotenv').config()
const {findPrivateKey} = require('./private-key')
const createProbot = require('./');
const resolve = require('./resolver')

const loadProbot = (plugin) => {
  const probot = createProbot({
    id: process.env.APP_ID,
    secret: process.env.WEBHOOK_SECRET,
    cert: findPrivateKey()
  })

  if (typeof plugin === 'string') {
    plugin = resolve(plugin)
  }

  probot.load(plugin)

  return probot
}

module.exports = (plugin, provider) => {

  const lambdaInstance = (event, context, callback) => {
    const probot = loadProbot(plugin)

    // Ends function immediately after callback
    context.callbackWaitsForEmptyEventLoop = false

    // Determine incoming webhook event type
    // Checking for different cases in case the http server is lowercasing everything
    const e = event.headers['x-github-event'] || event.headers['X-GitHub-Event']
    const id = event.headers['x-github-delivery'] || event.headers['X-GitHub-Delivery']

    // Convert the payload to an Object if API Gateway stringifies it
    event.body = (typeof event.body === 'string') ? JSON.parse(event.body) : event.body

    // Do the thing
    console.log(`Received event ${e}${event.body.action ? ('.' + event.body.action) : ''}`)
    if (event) {
      try {
        probot.receive({
          event: e,
          payload: event.body
        }).then(() => {
          const res = {
            statusCode: 200,
            body: JSON.stringify({
              message: 'Executed on Lambda'
            })
          }
          return callback(null, res)
        })
      } catch (err) {
        console.error(err)
        callback(err)
      }
    } else {
      console.error({ event, context })
      callback('unknown error')
    }
  }

  const gcfInstance = (request, response) => {
    const probot = loadProbot(plugin)

    const event = request.get('x-github-event') || request.get('X-GitHub-Event')
    const id = request.get('x-github-delivery') || request.get('X-GitHub-Delivery')
    console.log(`Received event ${event}${request.body.action ? ('.' + request.body.action) : ''}`)
    if (event) {
      try {
        probot.receive({
          event: event,
          id: id,
          payload: request.body
        }).then(() => {
          response.send({
            statusCode: 200,
            body: JSON.stringify({
              message: 'Executed'
            })
          })
        })
      } catch (err) {
        console.error(err)
        response.sendStatus(500)
      }
    } else {
      console.error(request)
      response.sendStatus(400)
    }
  }

  switch (provider) {
    case 'aws':
      return lambdaInstance
    case 'gcf':
      return gcfInstance
    default:
      throw new Error('Please specify a serverless provider (Options: \'aws\' | \'gcf\')')
  }

}

// FIXME: move this to a test helper that can be used by other apps

const Keyv = require('keyv')
const {createRobot} = require('../..')

const cache = new Keyv()

const app = jest.fn().mockReturnValue('test')

module.exports = {
  createRobot () {
    return createRobot({app, cache})
  }
}

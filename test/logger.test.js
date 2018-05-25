const {logger} = require('../src/logger')
const {wrapLogger} = require('../src/wrap-logger')

describe('logger', () => {
  let output

  beforeEach(() => {
    output = []

    logger.addStream({
      level: 'trace',
      type: 'raw',
      stream: {write: log => output.push(log)}
    })
  })

  describe('child', () => {
    test('sets attributes', () => {
      const child = wrapLogger(logger).child({user: 'me'})
      child.debug('attributes will get added to this')
      expect(output[0]).toHaveProperty('user', 'me')
    })

    test('allows setting the name', () => {
      const child = wrapLogger(logger).child({name: 'test'})
      child.debug('hello')
      expect(output[0]).toHaveProperty('name', 'test')
    })
  })
})

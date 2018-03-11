const logger = require('../lib/logger')

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
      const child = logger.wrap().child({user: 'me'})
      child.debug('attributes will get added to this')
      expect(output[0]).toHaveProperty('user', 'me')
    })

    test('allows setting the name', () => {
      const child = logger.wrap().child({name: 'test'})
      child.debug('hello')
      expect(output[0]).toHaveProperty('name', 'test')
    })
  })
})

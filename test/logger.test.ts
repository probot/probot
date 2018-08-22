import { logger } from '../src/logger'
import { wrapLogger } from '../src/wrap-logger'

describe('logger', () => {
  let output: string[]

  beforeEach(() => {
    output = []

    logger.addStream({
      level: 'trace',
      stream: { write: function define (log: string): any {
        output.push(log)
      }},
      type: 'raw'
    })
  })

  describe('child', () => {
    test('sets attributes', () => {
      const child = wrapLogger(logger).child({ user: 'me' })
      child.debug('attributes will get added to this')
      expect(output[0]).toHaveProperty('user', 'me')
    })

    test('allows setting the name', () => {
      const child = wrapLogger(logger).child({ name: 'test' })
      child.debug('hello')
      expect(output[0]).toHaveProperty('name', 'test')
    })
  })
})

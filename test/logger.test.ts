import { logger } from '../src/logger'
import { wrapLogger } from '../src/wrap-logger'

describe('logger', () => {
  let output: any
  beforeEach(() => {
    output = []

    logger.addStream({
      level: 'trace',
      stream: { write: (log: any) => output.push(log) },
      type: 'raw'
    } as any)
  })

  describe('child', () => {
    test('sets attributes', () => {
      const child = wrapLogger(logger).child({ user: 'me' } as any)
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

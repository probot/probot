import { logger } from '../src/logger'
import { wrapLogger } from '../src/wrap-logger'

describe('logger', () => {
  let output: string[]
  beforeEach(() => {
    output = []

    logger.addStream({
      level: 'trace',
      stream: { write: (log: any) => output.push(log) } as any,
      type: 'raw'
    })
  })

  describe('child', () => {
    test('sets attributes', () => {
      const child = wrapLogger(logger).child({ id: '1234' })
      child.debug('attributes will get added to this')
      expect(output[0]).toHaveProperty('id', '1234')
    })

    test('allows setting the name', () => {
      const child = wrapLogger(logger).child({ name: 'test' })
      child.debug('hello')
      expect(output[0]).toHaveProperty('name', 'test')
    })
  })
})

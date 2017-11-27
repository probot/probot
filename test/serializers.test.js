const serializers = require('../lib/serializers')

describe('serializers', () => {
  describe('event', () => {
    it('works with a legit event', () => {
      const event = {id: 1,
        event: 'test',
        payload: {
          action: 'test',
          repository: {full_name: 'probot/test'},
          installation: {id: 1}
        }
      }
      expect(serializers.event(event)).toEqual({
        id: 1,
        event: 'test.test',
        repository: 'probot/test',
        installation: 1
      })
    })

    it('works a malformed event', () => {
      const event = {id: 1,
        event: 'test',
        payload: {}}
      expect(serializers.event(event)).toEqual({
        id: 1,
        event: 'test',
        repository: undefined,
        installation: undefined
      })
    })

    it('works with boolean', () => {
      expect(serializers.event(false)).toBe(false)
    })

    it('works empty object', () => {
      expect(serializers.event({})).toEqual({})
    })
  })
})

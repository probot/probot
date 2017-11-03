const serializers = require('../lib/serializers')

describe('serializers', () => {
  describe('event', () => {
    it('works with a legit event', () => {
      const event = {id: 1,
        event: 'test',
        payload: {
          action: 'test',
          repository: {full_name: 'probot/test'}
        }}
      expect(serializers.event(event)).toEqual({
        id: 1,
        event: 'test',
        action: 'test',
        repository: 'probot/test'
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

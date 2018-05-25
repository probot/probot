const {serializers} = require('../src/serializers')

describe('serializers', () => {
  describe('repository', () => {
    it('returns the repository\'s full name', () => {
      const repo = { full_name: 'probot/JasonEtco' }
      expect(serializers.repository(repo)).toBe('probot/JasonEtco')
    })
  })

  describe('installation', () => {
    it('returns the installation\'s account login', () => {
      const inst = { account: { login: 'JasonEtco' } }
      expect(serializers.installation(inst)).toBe('JasonEtco')
    })

    it('returns the installation if no account exists', () => {
      const inst = { foo: true, bar: false }
      expect(serializers.installation(inst)).toEqual(inst)
    })
  })

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

  describe('res', () => {
    it('returns the provided object if no status exists', () => {
      const res = { foo: true, bar: false }
      expect(serializers.res(res)).toEqual(res)
    })

    it('returns nothing when passed nothing', () => {
      expect(serializers.res()).toBe(undefined)
    })
  })
})

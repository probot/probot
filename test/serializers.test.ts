import { serializers } from '../src/serializers'

describe('serializers', () => {
  describe('repository', () => {
    it("returns the repository's full name", () => {
      const repo = { full_name: 'probot/JasonEtco' }
      expect(serializers.repository(repo)).toBe('probot/JasonEtco')
    })
  })

  describe('installation', () => {
    it("returns the installation's account login", () => {
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
      const event = {
        id: 1,
        name: 'test',
        payload: {
          action: 'test',
          installation: { id: 1 },
          repository: { full_name: 'probot/test' }
        }
      }
      expect(serializers.event(event)).toEqual({
        event: 'test.test',
        id: 1,
        installation: 1,
        repository: 'probot/test'
      })
    })

    it('works a malformed event', () => {
      const event = {
        id: 1,
        name: 'test',
        payload: {}
      }
      expect(serializers.event(event)).toEqual({
        event: 'test',
        id: 1,
        installation: undefined,
        repository: undefined
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
      expect(serializers.res(undefined)).toBe(undefined)
    })
  })
})

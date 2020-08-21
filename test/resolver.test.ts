import { resolve, Resolver } from '../src/resolver'

const stubAppFnPath = require.resolve('./fixtures/plugin/stub-plugin')
const basedir = process.cwd()

describe('resolver', () => {
  let stubResolver: Resolver

  beforeEach(() => {
    stubResolver = jest.fn().mockReturnValue(stubAppFnPath)
  })

  it('loads the module at the resolved path', () => {
    const module = resolve('foo', { resolver: stubResolver })
    expect(module).toBe(require(stubAppFnPath))
    expect(stubResolver).toHaveBeenCalledWith('foo', { basedir })
  })
})

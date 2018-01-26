const resolve = require('../lib/resolver')

const stubPluginPath = require.resolve('./fixtures/plugin/stub-plugin')
const basedir = process.cwd()

describe('resolver', () => {
  let stubResolver

  beforeEach(() => {
    stubResolver = jest.fn().mockReturnValue(stubPluginPath)
  })

  it('loads the module at the resolved path', () => {
    const module = resolve('foo', {resolver: stubResolver})
    expect(module).toBe(require(stubPluginPath))
    expect(stubResolver).toHaveBeenCalledWith('foo', {basedir})
  })
})

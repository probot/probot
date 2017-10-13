/* eslint prefer-arrow-callback: off */

const expect = require('expect')
const resolve = require('../lib/resolver')

const stubPluginPath = require.resolve('./fixtures/plugin/stub-plugin')
const basedir = process.cwd()

describe('resolver', function () {
  let stubResolver

  beforeEach(function () {
    stubResolver = expect.createSpy().andReturn(stubPluginPath)
  })

  it('loads the module at the resolved path', function () {
    const module = resolve('foo', {resolver: stubResolver})
    expect(module).toBe(require(stubPluginPath))
    expect(stubResolver).toHaveBeenCalledWith('foo', {basedir})
  })
})

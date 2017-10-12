/* eslint prefer-arrow-callback: off */

const expect = require('expect')
const createResolver = require('../lib/resolver')

const stubPluginPath = require.resolve('./fixtures/plugin/stub-plugin')
const basedir = process.cwd()
const nullLogger = {};
['trace', 'debug', 'info', 'warn', 'error', 'fatal'].forEach(level => {
  nullLogger[level] = function () { }
})

describe('resolver', function () {
  let probot
  let pluginLoader
  let resolver

  beforeEach(function () {
    probot = {
      load: expect.createSpy(),
      logger: nullLogger
    }

    resolver = expect.createSpy().andReturn(stubPluginPath)
  })

  describe('factory', function () {
    describe('when no robot provided', function () {
      it('should throw a TypeError', function () {
        expect(createResolver).toThrow(TypeError)
      })
    })

    describe('when robot provided', function () {
      it('should return an object', function () {
        expect(createResolver(probot)).toBeA(Object)
      })
    })

    describe('load()', function () {
      beforeEach(() => {
        pluginLoader = createResolver(probot, {resolver})
      })

      describe('when supplied no plugin names', function () {
        it('should do nothing', function () {
          pluginLoader.load()
          expect(resolver).toNotHaveBeenCalled()
          expect(probot.load).toNotHaveBeenCalled()
        })
      })

      describe('when supplied plugin name(s)', function () {
        it('should attempt to resolve plugins by name and basedir', function () {
          pluginLoader.load(['foo', 'bar'])
          expect(resolver).toHaveBeenCalledWith('foo', {basedir})
            .toHaveBeenCalledWith('bar', {basedir})
        })

        it('should ask the robot to load a plugin at its resolved path', function () {
          pluginLoader.load(['see-stub-for-resolved-path'])
          expect(probot.load).toHaveBeenCalledWith(require(stubPluginPath))
        })
      })
    })
  })
})

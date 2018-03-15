const fs = require('fs')
const readFileSync = fs.readFileSync
const readdirSync = fs.readdirSync

const {findPrivateKey} = require('../src/private-key')

describe('private-key', function () {
  let privateKey
  let keyfilePath

  beforeEach(function () {
    privateKey = 'I AM PRIVET KEY!?!!~1!'
    keyfilePath = '/some/path'
    fs.readFileSync = jest.fn().mockReturnValue(privateKey)
  })

  afterEach(function () {
    fs.readFileSync = readFileSync
  })

  describe('findPrivateKey()', function () {
    describe('when a filepath is provided', function () {
      it('should read the file at given filepath', function () {
        findPrivateKey(keyfilePath)
        expect(fs.readFileSync).toHaveBeenCalledWith(keyfilePath)
      })

      it('should return the key', function () {
        expect(findPrivateKey(keyfilePath)).toEqual(privateKey)
      })
    })

    describe('when a PRIVATE_KEY env var is provided', function () {
      beforeEach(function () {
        process.env.PRIVATE_KEY = privateKey
      })

      afterEach(function () {
        delete process.env.PRIVATE_KEY
      })

      it('should return the key', function () {
        expect(findPrivateKey()).toEqual(privateKey)
      })
    })

    describe('when a PRIVATE_KEY has line breaks', function () {
      beforeEach(function () {
        process.env.PRIVATE_KEY = 'line 1\\nline 2'
      })

      afterEach(function () {
        delete process.env.PRIVATE_KEY
      })

      it('should return the key', function () {
        expect(findPrivateKey()).toEqual('line 1\nline 2')
      })
    })

    describe('when a PRIVATE_KEY_PATH env var is provided', function () {
      beforeEach(function () {
        process.env.PRIVATE_KEY_PATH = keyfilePath
      })

      afterEach(function () {
        delete process.env.PRIVATE_KEY_PATH
      })

      it('should read the file at given filepath', function () {
        findPrivateKey()
        expect(fs.readFileSync).toHaveBeenCalledWith(keyfilePath)
      })

      it('should return the key', function () {
        expect(findPrivateKey()).toEqual(privateKey)
      })
    })

    describe('when no private key is provided', function () {
      beforeEach(function () {
        fs.readdirSync = jest.fn().mockReturnValue([
          'foo.txt',
          'foo.pem'
        ])
      })

      it('should look for one in the current directory', function () {
        findPrivateKey()
        expect(fs.readdirSync).toHaveBeenCalledWith(process.cwd())
      })

      describe('and several key files are present', function () {
        beforeEach(function () {
          fs.readdirSync = jest.fn().mockReturnValue([
            'foo.txt',
            'foo.pem',
            'bar.pem'
          ])
        })

        it('should throw an error', function () {
          expect(findPrivateKey).toThrow(/Found several private keys: foo.pem, bar.pem/i)
        })
      })

      describe('and a key file is present', function () {
        it('should load the key file', function () {
          findPrivateKey()
          expect(fs.readFileSync).toHaveBeenCalledWith('foo.pem')
        })
      })

      describe('and a key file is not present', function () {
        beforeEach(function () {
          fs.readdirSync = readdirSync
        })

        it('should throw an error', function () {
          expect(findPrivateKey).toThrow(/missing private key for GitHub App/i)
        })
      })
    })
  })
})

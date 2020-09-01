import fs from 'fs'
const readFileSync = fs.readFileSync
const existsSync = fs.existsSync
const readdirSync = fs.readdirSync

import { findPrivateKey } from '../src/private-key'

describe('private-key', () => {
  let privateKey: string
  let keyfilePath: string

  beforeEach(() => {
    privateKey = '-----BEGIN RSA PRIVATE KEY-----\nTHIs+is+A+Fak3+K3y\n-----END RSA PRIVATE KEY-----'
    keyfilePath = '/some/path'
    fs.readFileSync = jest.fn().mockReturnValue(privateKey)
  })

  afterEach(() => {
    fs.readFileSync = readFileSync
  })

  describe('findPrivateKey(undefined)', () => {
    describe('when a filepath is provided', () => {
      it('should read the file at given filepath', () => {
        findPrivateKey(keyfilePath)
        expect(fs.readFileSync).toHaveBeenCalledWith(keyfilePath, 'utf8')
      })

      it('should return the key', () => {
        expect(findPrivateKey(keyfilePath)).toEqual(privateKey)
      })
    })

    describe('when a PRIVATE_KEY env var is provided', () => {
      beforeEach(() => {
        process.env.PRIVATE_KEY = privateKey
      })

      afterEach(() => {
        delete process.env.PRIVATE_KEY
      })

      it('should return the key', () => {
        process.env.PRIVATE_KEY = privateKey
        expect(findPrivateKey(undefined)).toEqual(privateKey)
      })
    })

    describe('when a PRIVATE_KEY has line breaks', () => {
      beforeEach(() => {
        process.env.PRIVATE_KEY = '-----BEGIN RSA PRIVATE KEY-----\\nTHIs+is+A+Fak3+K3y\\n-----END RSA PRIVATE KEY-----'
      })

      afterEach(() => {
        delete process.env.PRIVATE_KEY
      })

      it('should return the key', () => {
        expect(findPrivateKey(undefined)).toEqual(privateKey)
      })
    })

    describe('when a PRIVATE_KEY is base64 encoded', () => {
      beforeEach(() => {
        process.env.PRIVATE_KEY = Buffer.from(privateKey).toString('base64')
      })

      afterEach(() => {
        delete process.env.PRIVATE_KEY
      })

      it('should decode and return the key', () => {
        expect(findPrivateKey(undefined)).toEqual(privateKey)
      })
    })

    describe('when a PRIVATE_KEY_PATH env var is provided', () => {
      beforeEach(() => {
        process.env.PRIVATE_KEY_PATH = keyfilePath
        fs.existsSync = jest.fn().mockReturnValue(true)
      })

      afterEach(() => {
        delete process.env.PRIVATE_KEY_PATH
        fs.existsSync = existsSync
      })

      it('should read the file at given filepath', () => {
        findPrivateKey(undefined)
        expect(fs.readFileSync).toHaveBeenCalledWith(keyfilePath, 'utf8')
      })

      it('should return the key', () => {
        expect(findPrivateKey(undefined)).toEqual(privateKey)
      })
    })

    describe('when a PRIVATE_KEY_PATH env var is provided but file is not present at that path', () => {
      beforeEach(() => {
        process.env.PRIVATE_KEY_PATH = keyfilePath
      })

      afterEach(() => {
        delete process.env.PRIVATE_KEY_PATH
      })

      it('should throw an error', () => {
        expect(findPrivateKey).toThrow(`Private key does not exists at path: ${keyfilePath}. Please check to ensure that the PRIVATE_KEY_PATH is correct.`)
      })
    })

    describe('when no private key is provided', () => {
      beforeEach(() => {
        fs.readdirSync = jest.fn().mockReturnValue([
          'foo.txt',
          'foo.pem'
        ])
      })

      it('should look for one in the current directory', () => {
        findPrivateKey(undefined)
        expect(fs.readdirSync).toHaveBeenCalledWith(process.cwd())
      })

      describe('and several key files are present', () => {
        beforeEach(() => {
          fs.readdirSync = jest.fn().mockReturnValue([
            'foo.txt',
            'foo.pem',
            'bar.pem'
          ])
        })

        it('should throw an error', () => {
          expect(findPrivateKey).toThrow(/Found several private keys: foo.pem, bar.pem/i)
        })
      })

      describe('and a key file is present', () => {
        it('should load the key file', () => {
          findPrivateKey(undefined)
          expect(fs.readFileSync).toHaveBeenCalledWith('foo.pem', 'utf8')
        })
      })

      describe('and a key file is not present', () => {
        beforeEach(() => {
          fs.readdirSync = readdirSync
        })

        it('should return null', () => {
          expect(findPrivateKey()).toBe(null)
        })
      })
    })
  })
})

// https://stackoverflow.com/questions/30734509/how-to-pass-optional-parameters-in-typescript-while-omitting-some-other-optional wtf

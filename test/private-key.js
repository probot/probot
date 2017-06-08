const fs = require('fs');

const expect = require('expect');

const {findPrivateKey} = require('../lib/private-key');

describe('private-key', function () {
  let privateKey;
  let keyfilePath;

  beforeEach(function () {
    privateKey = 'I AM PRIVET KEY!?!!~1!';
    keyfilePath = '/some/path';
    expect.spyOn(fs, 'readFileSync')
      .andReturn(privateKey);
  });

  afterEach(function () {
    expect.restoreSpies();
  });

  describe('findPrivateKey()', function () {
    describe('when a filepath is provided', function () {
      it('should read the file at given filepath', function () {
        findPrivateKey(keyfilePath);
        expect(fs.readFileSync)
          .toHaveBeenCalledWith(keyfilePath);
      });

      it('should return the key', function () {
        expect(findPrivateKey(keyfilePath))
          .toEqual(privateKey);
      });
    });

    describe('when a PRIVATE_KEY env var is provided', function () {
      beforeEach(function () {
        process.env.PRIVATE_KEY = privateKey;
      });

      afterEach(function () {
        delete process.env.PRIVATE_KEY;
      });

      it('should return the key', function () {
        expect(findPrivateKey())
          .toEqual(privateKey);
      });
    });

    describe('when a PRIVATE_KEY_PATH env var is provided', function () {
      beforeEach(function () {
        process.env.PRIVATE_KEY_PATH = keyfilePath;
      });

      afterEach(function () {
        delete process.env.PRIVATE_KEY_PATH;
      });

      it('should read the file at given filepath', function () {
        findPrivateKey();
        expect(fs.readFileSync)
          .toHaveBeenCalledWith(keyfilePath);
      });

      it('should return the key', function () {
        expect(findPrivateKey())
          .toEqual(privateKey);
      });
    });

    describe('when no private key is provided', function () {
      beforeEach(function () {
        expect.spyOn(fs, 'readdirSync')
          .andReturn([
            'foo.txt',
            'foo.pem'
          ]);
      });

      it('should look for one in the current directory', function () {
        findPrivateKey();
        expect(fs.readdirSync)
          .toHaveBeenCalledWith(process.cwd());
      });

      describe('and a key file is present', function () {
        it('should load the key file', function () {
          findPrivateKey();
          expect(fs.readFileSync)
            .toHaveBeenCalledWith('foo.pem');
        });
      });

      describe('and a key file is not present', function () {
        beforeEach(function () {
          fs.readdirSync.restore();
        });

        it('should throw an error', function () {
          expect(findPrivateKey)
            .toThrow(Error, /missing private key for GitHub App/i);
        });
      });
    });
  });
});

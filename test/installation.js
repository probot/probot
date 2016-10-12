const expect = require('expect');
const installations = require('../lib/installations');
const payload = require ('./fixtures/webhook/installation.deleted');

describe('installation', () => {
  describe('register', () => {
    it('registers the installation', () => {
      installations.register(payload.installation);
      expect(installations.for('bkeepers-inc')).toEqual(payload.installation);
    })
  });

  describe('unregister', () => {
    it('unregisters the installation', () => {
      installations.register(payload.installation);
      installations.unregister(payload.installation);
      expect(installations.for('bkeepers-inc')).toBe(undefined);
    })
  });
});

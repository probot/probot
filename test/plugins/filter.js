const expect = require('expect');
const Filter = require('../../lib/plugins/filter');

const createSpy = expect.createSpy;

describe('filter plugin', () => {
  const event = {};
  const context = {event};

  let filter;

  before(() => {
    filter = new Filter();
  });

  describe('filter', () => {
    it('passes the event and context objects to the supplied function', () => {
      const fn = createSpy();
      filter.filter(context, fn);

      expect(fn).toHaveBeenCalledWith(event, context);
    });

    it('returns true if the function does', () => {
      const fn = createSpy().andReturn(true);

      expect(filter.filter(context, fn)).toBe(true);
    });

    it('returns a rejected promise if the function returns false', () => {
      const fn = createSpy().andReturn(false);

      return filter.filter(context, fn).catch(err => {
        expect(err.message).toEqual('halted');
      });
    });
  });

  describe('then', () => {
    it('passes the event and context objects to the supplied function', () => {
      const fn = createSpy();
      filter.filter(context, fn);

      expect(fn).toHaveBeenCalledWith(event, context);
    });

    it('returns whatever the function does', () => {
      const fn = createSpy().andReturn('bazinga!');

      expect(filter.then(context, fn)).toBe('bazinga!');
    });
  });
});

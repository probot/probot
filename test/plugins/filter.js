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

  describe('on', () => {
    describe('matching only the event name', () => {
      it('matches on a single event', () => {
        event.event = 'issues';

        return filter.on(context, 'issues').then(result => {
          expect(result).toEqual('issues');
        });
      });

      it('fails to match on a single event', () => {
        event.event = 'issues';

        return filter.on(context, 'foo').catch(err => {
          expect(err.message).toBe('halted');
        });
      });

      it('matches any of the event names', () => {
        event.event = 'foo';

        return filter.on(context, 'issues', 'foo').then(result => {
          expect(result).toEqual('foo');
        });
      });

      it('fails to match if none of the event names match', () => {
        event.event = 'bar';

        return filter.on(context, 'issues', 'foo').catch(err => {
          expect(err.message).toBe('halted');
        });
      });
    });

    describe('matching the event and action', () => {
      it('matches on a single event', () => {
        event.event = 'issues';
        event.payload = {action: 'opened'};

        return filter.on(context, 'issues.opened').then(result => {
          expect(result).toBe('issues.opened');
        });
      });

      it('fails to match on a single event', () => {
        event.event = 'issues';
        event.payload = {action: 'foo'};

        return filter.on(context, 'issues.opened').catch(err => {
          expect(err.message).toBe('halted');
        });
      });

      it('matches any of the event descriptors', () => {
        event.event = 'issues';
        event.payload = {action: 'closed'};

        return filter.on(context, 'issues.opened', 'issues.closed').then(result => {
          expect(result).toBe('issues.closed');
        });
      });

      it('fails to match if none of the event descriptors match', () => {
        event.event = 'issues';
        event.payload = {action: 'foo'};

        return filter.on(context, 'issues.opened', 'issues.closed').catch(err => {
          expect(err.message).toBe('halted');
        });
      });
    });
  });
});

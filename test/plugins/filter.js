const expect = require('expect');
const Filter = require('../../lib/plugins/filter');

const plugin = new Filter();

const context = {
  event: {event: 'issues', payload: {action: 'opened'}}
};

describe('description', () => {
  describe('on', () => {
    it('is truthy for matching event', done => {
      expect(plugin.on(context, 'issues')).toHaveBeenResolved(done);
    });

    it('is truthy for multiple events', done => {
      expect(plugin.on(context, 'pull_request', 'issues')).toHaveBeenResolved(done);
    });

    it('is truthy for event with action', done => {
      expect(plugin.on(context, 'issues.opened')).toHaveBeenResolved(done);
    });

    it('is truthy for multiple events with action', done => {
      expect(plugin.on(context, 'issues.labeled', 'issues.opened')).toHaveBeenResolved(done);
    });

    it('is falsy for different event', done => {
      expect(plugin.on(context, 'pull_request')).toHaveBeenRejected(done);
    });

    it('is falsy for different action', done => {
      expect(plugin.on(context, 'issues.labeled')).toHaveBeenRejected(done);
    });
  });
});

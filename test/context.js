const expect = require('expect');
const Context = require('../lib/context');

describe('Context', () => {
  let event;
  let context;

  beforeEach(() => {
    event = {
      payload: {
        repository: {
          owner: {login: 'bkeepers'},
          name: 'probot'
        },
        issue: {number: 4}
      }
    };
    context = new Context(event);
  });

  describe('repo', () => {
    it('returns attributes from repository payload', () => {
      expect(context.repo()).toEqual({owner: 'bkeepers', repo:'probot'});
    });

    it('merges attributes', () => {
      expect(context.repo({foo: 1, bar: 2})).toEqual({
        owner: 'bkeepers', repo:'probot', foo: 1, bar: 2
      });
    });

    it('overrides repo attributes', () => {
      expect(context.repo({owner: 'muahaha'})).toEqual({
        owner: 'muahaha', repo:'probot'
      });
    });

    // The `repository` object on the push event has a different format than the other events
    // https://developer.github.com/v3/activity/events/types/#pushevent
    it('properly handles the push event', () => {
      event.payload = require('./fixtures/webhook/push');

      context = new Context(event);
      expect(context.repo()).toEqual({owner: 'bkeepers-inc', repo:'test'});
    });
  });

  describe('issue', () => {
    it('returns attributes from repository payload', () => {
      expect(context.issue()).toEqual({owner: 'bkeepers', repo:'probot', number: 4});
    });

    it('merges attributes', () => {
      expect(context.issue({foo: 1, bar: 2})).toEqual({
        owner: 'bkeepers', repo:'probot', number: 4, foo: 1, bar: 2
      });
    });

    it('overrides repo attributes', () => {
      expect(context.issue({owner: 'muahaha', number: 5})).toEqual({
        owner: 'muahaha', repo:'probot', number: 5
      });
    });
  });
});

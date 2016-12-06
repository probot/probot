const expect = require('expect');
const Context = require('../lib/context');

describe('Context', () => {
  const github = {};
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
    context = new Context(github, event);
  });

  describe('toRepo', () => {
    it('returns attributes from repository payload', () => {
      expect(context.toRepo()).toEqual({owner: 'bkeepers', repo:'probot'});
    });

    it('merges attributes', () => {
      expect(context.toRepo({foo: 1, bar: 2})).toEqual({
        owner: 'bkeepers', repo:'probot', foo: 1, bar: 2
      });
    });

    it('overrides repo attributes', () => {
      expect(context.toRepo({owner: 'muahaha'})).toEqual({
        owner: 'muahaha', repo:'probot'
      });
    });

    // The `repository` object on the push event has a different format than the other events
    // https://developer.github.com/v3/activity/events/types/#pushevent
    it('properly handles the push event', () => {
      event.payload = require('./fixtures/webhook/push');

      context = new Context(github, event);
      expect(context.toRepo()).toEqual({owner: 'bkeepers-inc', repo:'test'});
    });
  });

  describe('toIssue', () => {
    it('returns attributes from repository payload', () => {
      expect(context.toIssue()).toEqual({owner: 'bkeepers', repo:'probot', number: 4});
    });

    it('merges attributes', () => {
      expect(context.toIssue({foo: 1, bar: 2})).toEqual({
        owner: 'bkeepers', repo:'probot', number: 4, foo: 1, bar: 2
      });
    });

    it('overrides repo attributes', () => {
      expect(context.toIssue({owner: 'muahaha', number: 5})).toEqual({
        owner: 'muahaha', repo:'probot', number: 5
      });
    });
  });
});

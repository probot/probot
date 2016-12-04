const expect = require('expect');
const Context = require('../lib/context');

describe('Context', () => {
  const github = {};
  const event = {
    payload: {
      repository: {
        owner: {login: 'bkeepers'},
        name: 'probot'
      },
      issue: {number: 4}
    }
  };
  const context = new Context(github, event);

  describe('toRepo', () => {
    it('returns attributes from repository payload', () => {
      expect(context.toRepo()).toEqual({owner: 'bkeepers', repo:'probot'});
    });

    it('merges attributes', () => {
      expect(context.toRepo({foo: 1, bar: 2})).toEqual({
        owner: 'bkeepers', repo:'probot', foo: 1, bar: 2
      });
    });

    it('does not override repo attributes', () => {
      expect(context.toRepo({owner: 'muahaha'})).toEqual({
        owner: 'bkeepers', repo:'probot'
      });
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

    it('does not override repo attributes', () => {
      expect(context.toIssue({owner: 'muahaha', number: 5})).toEqual({
        owner: 'bkeepers', repo:'probot', number: 4
      });
    });
  });
});

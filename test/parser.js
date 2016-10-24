const fs = require('fs');
const expect = require('expect');
const peg = require('pegjs');

const parser = peg.generate(fs.readFileSync('./lib/parser.pegjs').toString());

describe('parser', () => {
  it('parses multiple statements', () => {
    expect(parser.parse(`
      on issues.opened then close;
      on pull_requests.open then assign(bkeepers);
    `)).toEqual({behaviors: [
      {
        on: [{action: 'opened', name: 'issues'}],
        then: [{name: 'close'}]
      },
      {
        on: [{action: 'open', name: 'pull_requests'}],
        then: [{name: 'assign', value: 'bkeepers'}]
      }
    ]});
  });

  it('parses a blank doc', () => {
    expect(parser.parse('\n\n\n')).toEqual({behaviors: []});
  });

  it.skip('fails on junk', () => {
    expect(parser.parse('onnope thennope;')).toEqual({behaviors: []});
  });

  describe('on', () => {
    it('parses an event', () => {
      expect(parser.parse('on issues then close;')).toEqual({behaviors: [{
        on: [{name: 'issues'}],
        then: [{name: 'close'}]
      }]});
    });

    it('parses an event and action', () => {
      expect(parser.parse('on issues.opened then close;')).toEqual({
        behaviors: [{
          on: [{name: 'issues', action: 'opened'}],
          then: [{name: 'close'}]
        }]
      });
    });

    it('parses multiple events', () => {
      expect(parser.parse(
        'on issues.opened or pull_request.opened then close;'
      )).toEqual({behaviors: [{
        on: [
          {name: 'issues', action: 'opened'},
          {name: 'pull_request', action: 'opened'}
        ],
        then: [{name: 'close'}]
      }]});
    });
  });

  describe('if', () => {
    it('parses simple conditionals', () => {
      expect(
        parser.parse('on issues if labeled(enhancement) then close;')
      ).toEqual({
        behaviors: [{
          on: [{name: 'issues'}],
          conditions: [{name: 'labeled', value: 'enhancement'}],
          then: [{name: 'close'}]
        }]
      });
    });
  });

  describe('then', () => {
    it('parses multiple words', () => {
      expect(parser.parse(
        'on issues then close and lock;'
      )).toEqual({behaviors: [{
        on: [{name: 'issues'}],
        then: [
          {name: 'close'},
          {name: 'lock'}
        ]
      }]});
    });

    it('parses string arguments', () => {
      expect(parser.parse(
        'on issues then comment("Hello World!");'
      )).toEqual({behaviors: [{
        on: [{name: 'issues'}],
        then: [
          {name: 'comment', value: 'Hello World!'}
        ]
      }]});
    });

    it('parses word arguments', () => {
      expect(parser.parse(
        'on issues then assign(bkeepers);'
      )).toEqual({behaviors: [{
        on: [{name: 'issues'}],
        then: [
          {name: 'assign', value: 'bkeepers'}
        ]
      }]});
    });

    it('parses multiple word arguments', () => {
      expect(parser.parse(
        'on issues then assign(bkeepers, hubot);'
      )).toEqual({behaviors: [{
        on: [{name: 'issues'}],
        then: [
          {name: 'assign', value: ['bkeepers', 'hubot']}
        ]
      }]});
    });
  });

  describe('comments', () => {
    it('ignores lines that start with comments', () => {
      expect(parser.parse(`
        # This could literally be anything.
        on issues then close;
      `)).toEqual(
        {behaviors: [{on: [{name: 'issues'}], then: [{name: 'close'}]}]}
      );
    });

    it('ignores trailing comments on lines', () => {
      expect(parser.parse(`
        on issues # Ignore this
        then close;
      `)).toEqual(
        {behaviors: [{on: [{name: 'issues'}], then: [{name: 'close'}]}]}
      );
    });
  });
});

const fs = require('fs');
const expect = require('expect');
const peg = require('pegjs');

const parser = peg.generate(fs.readFileSync('./lib/parser.pegjs').toString(),
  {allowedStartRules: ['start', 'if']});

describe('parser', () => {
  it('successfully parses a bunch of examples', () => {
    parser.parse(fs.readFileSync('./test/fixtures/behaviors').toString());
  });

  it('parses multiple statements', () => {
    expect(parser.parse(`
      on issues.opened then close;
      on pull_requests.open then assign(bkeepers);
    `)).toEqual([
      {
        type: 'behavior',
        events: [{type: 'event', action: 'opened', name: 'issues'}],
        actions: [{type: 'action', name: 'close'}]
      },
      {
        type: 'behavior',
        events: [{type: 'event', action: 'open', name: 'pull_requests'}],
        actions: [{type: 'action', name: 'assign', value: 'bkeepers'}]
      }
    ]);
  });

  it('parses a blank doc', () => {
    expect(parser.parse('\n\n\n')).toEqual([]);
  });

  it.skip('fails on junk', () => {
    expect(parser.parse('onnope thennope;')).toEqual([]);
  });

  describe('on', () => {
    it('parses an event', () => {
      expect(parser.parse('on issues then close;')).toEqual([{
        type: 'behavior',
        events: [{type: 'event', name: 'issues'}],
        actions: [{type: 'action', name: 'close'}]
      }]);
    });

    it('parses an event and action', () => {
      expect(parser.parse('on issues.opened then close;')).toEqual([{
        type: 'behavior',
        events: [{type: 'event', name: 'issues', action: 'opened'}],
        actions: [{type: 'action', name: 'close'}]
      }]);
    });

    it('parses multiple events', () => {
      expect(parser.parse(
        'on issues.opened or pull_request.opened then close;'
      )).toEqual([{
        type: 'behavior',
        events: [
          {type: 'event', name: 'issues', action: 'opened'},
          {type: 'event', name: 'pull_request', action: 'opened'}
        ],
        actions: [{type: 'action', name: 'close'}]
      }]);
    });
  });

  describe('if', () => {
    it('parses simple conditionals', () => {
      expect(
        parser.parse('on issues if labeled(enhancement) then close;')
      ).toEqual([{
        type: 'behavior',
        events: [{type: 'event', name: 'issues'}],
        conditions: [{type: 'condition', name: 'labeled', value: 'enhancement'}],
        actions: [{type: 'action', name: 'close'}]
      }]);
    });

    it('parses logical or conditions', () => {
      expect(
        parser.parse('if labeled(enhancement) or labeled(design)', {startRule: 'if'})
      ).toEqual([{
        type: 'LogicalExpression',
        operator: 'or',
        left: {type: 'condition', name: 'labeled', value: 'enhancement'},
        right: {type: 'condition', name: 'labeled', value: 'design'}
      }]);
    });

    it('parses multiple logical conditions', () => {
      expect(parser.parse(
        'if labeled(enhancement) or labeled(design) or labeled(bug)',
        {startRule: 'if'})
      ).toEqual([{
        type: 'LogicalExpression',
        operator: 'or',
        left: {
          type: 'LogicalExpression',
          left: {type: 'condition', name: 'labeled', value: 'enhancement'},
          operator: 'or',
          right: {type: 'condition', name: 'labeled', value: 'design'}
        },
        right: {type: 'condition', name: 'labeled', value: 'bug'}
      }]);
    });

    it('parses logical and conditions', () => {
      expect(
        parser.parse('if labeled(enhancement) and labeled(design)', {startRule: 'if'})
      ).toEqual([{
        type: 'LogicalExpression',
        operator: 'and',
        left: {type: 'condition', name: 'labeled', value: 'enhancement'},
        right: {type: 'condition', name: 'labeled', value: 'design'}
      }]);
    });

    it('parses attributes, matches, and regexps', () => {
      expect(
        parser.parse('if @issue.user.login matches "bot$"', {startRule: 'if'})
      ).toEqual([{
        type: 'LogicalExpression',
        operator: 'matches',
        left: {type: 'attribute', name: ['issue', 'user', 'login']},
        right: 'bot$'
      }]);
    });
  });

  describe('then', () => {
    it('parses multiple words', () => {
      expect(parser.parse(
        'on issues then close and lock;'
      )).toEqual([{
        type: 'behavior',
        events: [{type: 'event', name: 'issues'}],
        actions: [
          {type: 'action', name: 'close'},
          {type: 'action', name: 'lock'}
        ]
      }]);
    });

    it('parses string arguments', () => {
      expect(parser.parse(
        'on issues then comment("Hello World!");'
      )).toEqual([{
        type: 'behavior',
        events: [{type: 'event', name: 'issues'}],
        actions: [
          {type: 'action', name: 'comment', value: 'Hello World!'}
        ]
      }]);
    });

    it('parses word arguments', () => {
      expect(parser.parse(
        'on issues then assign(bkeepers);'
      )).toEqual([{
        type: 'behavior',
        events: [{type: 'event', name: 'issues'}],
        actions: [
          {type: 'action', name: 'assign', value: 'bkeepers'}
        ]
      }]);
    });

    it('parses multiple word arguments', () => {
      expect(parser.parse(
        'on issues then assign(bkeepers, hubot);'
      )).toEqual([{
        type: 'behavior',
        events: [{type: 'event', name: 'issues'}],
        actions: [
          {type: 'action', name: 'assign', value: ['bkeepers', 'hubot']}
        ]
      }]);
    });
  });

  describe('comments', () => {
    it('ignores lines that start with comments', () => {
      expect(parser.parse(`
        # This could literally be anything.
        on issues then close;
      `)).toEqual(
        [{type: 'behavior',
        events: [{type: 'event', name: 'issues'}],
        actions: [{type: 'action', name: 'close'}]}]
      );
    });

    it('ignores trailing comments on lines', () => {
      expect(parser.parse(`
        on issues # Ignore this
        then close;
      `)).toEqual([{
        type: 'behavior',
        events: [{type: 'event', name: 'issues'}],
        actions: [{type: 'action', name: 'close'}]
      }]);
    });
  });
});

const expect = require('expect');
const fs = require('fs');
var peg = require('pegjs');
var parser = peg.generate(fs.readFileSync('./lib/parser.pegjs').toString());

describe('parser', () => {
  describe('on', () => {
    it('parses an event', () => {
      expect(parser.parse('on issues then close')).toEqual({
        on: [{name: 'issues'}],
        then: [{name: 'close'}]
      });
    });

    it('parses an event and action', () => {
      expect(parser.parse('on issues.opened then close')).toEqual({
        on: [{name: 'issues', action: 'opened'}],
        then: [{name: 'close'}]
      });
    });

    it('parses multiple events', () => {
      expect(parser.parse('on issues.opened and pull_request.opened then close')).toEqual({
        on: [
          {name: 'issues', action: 'opened'},
          {name: 'pull_request', action: 'opened'}
        ],
        then: [{name: 'close'}]
      });
    });
  });

  describe('then', () => {
    it('parses multiple words', () => {
      expect(parser.parse('on issues then close and lock')).toEqual({
        on: [{name: 'issues'}],
        then: [
          {name: 'close'},
          {name: 'lock'}
        ]
      });
    });

    it('parses string arguments', () => {
      expect(parser.parse('on issues then comment("Hello World!")')).toEqual({
        on: [{name: 'issues'}],
        then: [
          {name: 'comment', value: 'Hello World!'}
        ]
      });
    });

    it('parses word arguments', () => {
      expect(parser.parse('on issues then assign(bkeepers)')).toEqual({
        on: [{name: 'issues'}],
        then: [
          {name: 'assign', value: 'bkeepers'}
        ]
      });
    });

    it('parses multiple word arguments', () => {
      expect(parser.parse('on issues then assign(bkeepers, hubot)')).toEqual({
        on: [{name: 'issues'}],
        then: [
          {name: 'assign', value: ['bkeepers', 'hubot']}
        ]
      });
    });
  });
});

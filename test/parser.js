const expect = require('expect');
const fs = require('fs');
var peg = require("pegjs");
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
      expect(parser.parse('on issues.opened, pull_request.opened then close')).toEqual({
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
  });
});

const expect = require('expect');
const fs = require('fs');
var peg = require("pegjs");
var parser = peg.generate(fs.readFileSync('./lib/parser.pegjs').toString());

describe('parser', () => {
  describe('on', () => {
    it('parses an event', () => {
      expect(parser.parse('on issues')).toEqual({
        on: [{name: 'issues'}]
      });
    });

    it('parses an event and action', () => {
      expect(parser.parse('on issues.opened')).toEqual({
        on: [{name: 'issues', action: 'opened'}]
      });
    });

    it('parses multiple events', () => {
      expect(parser.parse('on issues.opened, pull_request.opened')).toEqual({
        on: [
          {name: 'issues', action: 'opened'},
          {name: 'pull_request', action: 'opened'}
        ]
      });
    });

  });
});

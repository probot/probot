const expect = require('expect');
const Transformer = require('../lib/transformer');
const Context = require('../lib/context');
const parser = require('../lib/parser');
const payload = require('./fixtures/webhook/issues.labeled.json');

const context = new Context({}, {}, {payload});

function test(string) {
  const ast = parser.parse(string, {startRule: 'if'});
  const condition = new Transformer(ast).transform();
  return typeof condition === 'function' ? condition(context) : condition;
}

describe('conditions', () => {
  describe('is', () => {
    it('passes when operands are equal', () => {
      expect(test(`if @sender.login is "bkeepers"`)).toBeTruthy();
    });

    it('fails when operands are not equal', () => {
      expect(test(`if @sender.login is "nobody"`)).toBeFalsy();
    });
  });

  describe('is not', () => {
    it('fails when operands are equal', () => {
      expect(test('if @sender.login is not "bkeepers"')).toBeFalsy();
    });

    it('passes when operands are not equal', () => {
      expect(test('if @sender.login is not "nobody"')).toBeTruthy();
    });
  });

  describe('contains', () => {
    it('passes when operand contains substring', () => {
      expect(test('if @issue.title contains "bug"')).toBeTruthy();
    });

    it('fails when operand does not contain substring', () => {
      expect(test('if @issue.title contains "nope"')).toBeFalsy();
    });
  });

  describe('matches', () => {
    it('passes when operand matches regexp', () => {
      expect(test('if @sender.login matches "ke+"')).toBeTruthy();
    });

    it('fails when operand does not match regexp', () => {
      expect(test('if @issue.title matches "nope"')).toBeFalsy();
    });
  });

  describe('or', () => {
    it('passes if either operand is truthy', () => {
      expect(test('if labeled(bug) or labeled(feature)')).toBeTruthy();
    });

    it('fails if neither operand is truthy', () => {
      expect(test('if labeled(nope) or labeled(never)')).toBeFalsy();
    });
  });

  describe('and', () => {
    it('passes if both operands are truthy', () => {
      expect(test('if labeled(bug) and @issue.title contains "bug"')).toBeTruthy();
    });

    it('fails if one operand is not truthy', () => {
      expect(test('if labeled(bug) and labeled(nope)')).toBeFalsy();
    });
  });
});

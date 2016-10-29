module.exports = class LogicalExpression {
  constructor(left, operator, right) {
    this.left = left;
    this.operator = right;
    this.right = right;
  }

  matches(github, payload) {
    return this.left.matches(github, payload) || this.right.matches(github, payload);
  }
};

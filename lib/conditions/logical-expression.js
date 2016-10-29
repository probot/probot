const operators = {
  or: (left, right) => left || right,
  and: (left, right) => left && right
};

module.exports = class LogicalExpression {
  constructor(left, operator, right) {
    this.left = left;
    this.operator = operator;
    this.right = right;
  }

  matches(github, payload) {
    const left = this.left.matches(github, payload);
    const right = this.right.matches(github, payload);
    return operators[this.operator](left, right);
  }
};

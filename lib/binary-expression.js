const operators = {
  'is':               (left, right) => left === right,
  'is not':           (left, right) => left !== right,
  'contains':         (left, right) => left.includes(right),
  'does not contain': (left, right) => !left.includes(right),
  'matches':          (left, right) => left.match(right),
  'does not match':   (left, right) => !left.match(right),
  'or':               (left, right) => left || right,
  'and':              (left, right) => left && right
};

function resolve(value, context) {
  if (typeof value === 'function') {
    return value(context);
  } else {
    return value;
  }
}

module.exports = (context, left, operator, right) => {
  const leftValue = resolve(left, context);
  const rightValue = resolve(right, context);
  return operators[operator](leftValue, rightValue);
};

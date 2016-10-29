const operators = {
  'is':       (left, right) => left === right,
  'is not': (left, right) => left !== right,
  'or':       (left, right) => left || right,
  'and':      (left, right) => left && right,
  'contains': (left, right) => left.includes(right),
  'matches':  (left, right) => left.match(right)
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

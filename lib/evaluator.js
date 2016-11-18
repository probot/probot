class Evaluator {
  // Public function to either pass the string through or lookup network data
  resolveData(data, fn) {
    // TODO make a network to fetch the data
    fn(data);
    return this;
  }
}

module.exports = Evaluator;

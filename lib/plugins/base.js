class MixinBuilder {
  constructor(superclass) {
    this.superclass = superclass;
  }

  with(...mixins) {
    return mixins.reduce((c, mixin) => mixin(c), this.superclass);
  }
}

const mix = superclass => new MixinBuilder(superclass);

class EvaluatorBase {
  // Public function to either pass the string through or lookup network data
  resolveData(data, fn) {
    // TODO make a network to fetch the data
    fn(data);
    return this;
  }
}

module.exports = {
  mix,
  Evaluator: EvaluatorBase
};

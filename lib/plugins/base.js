// This is some stuff to handle mixing in plugins into a base class
let mix = (superclass) => new MixinBuilder(superclass);

class MixinBuilder {
  constructor(superclass) {
    this.superclass = superclass;
  }

  with(...mixins) {
    return mixins.reduce((c, mixin) => mixin(c), this.superclass);
  }
}

class EvaluatorBase {
  // Public function to either pass the string through or lookup network data
  resolveData(data, fn) {
    // TODO make a network to fetch the data
    fn(data)
    return this;
  }
}


module.exports = {
  mix: mix,
  Evaluator: EvaluatorBase,
}

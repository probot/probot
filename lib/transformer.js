var walk = require('tree-walk');

const Behavior = require('./behavior');
const actions = require('./actions');

module.exports = class Transformer {
  constructor(tree) {
    this.behaviors = walk.filter(tree, walk.preorder, function(node) {
      return node.type === 'behavior';
    });
  }

  transform() {
    return walk.reduce(this.behaviors, this.walk.bind(this));
  }

  walk(result, node) {
    if(this[node.type]) {
      return this[node.type](result, node);
    } else {
      return result || node;
    }
  }

  action(node, result) {
    return new Action(node.name, node.value);
  }

  behavior(result, node) {
    return new Behavior(result.events, result.conditions, result.then);
  }
}

class Action {
  constructor(name, value) {
    this.name = name;
    this.value = value;
  }

  call(github, payload) {
    actions[this.name](github, payload, this.value);
  }
}

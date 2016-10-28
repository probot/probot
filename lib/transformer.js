const walk = require('tree-walk');
const Behavior = require('./behavior');
const actions = require('./actions');

class Action {
  constructor(name, value) {
    this.name = name;
    this.value = value;
  }

  call(github, payload) {
    actions[this.name](github, payload, this.value);
  }
}

module.exports = class Transformer {
  constructor(tree) {
    this.behaviors = walk.filter(tree, walk.preorder, node => {
      return node.type === 'behavior';
    });
  }

  transform() {
    return walk.reduce(this.behaviors, this.walk.bind(this));
  }

  walk(result, node) {
    if (this[node.type]) {
      return this[node.type](result, node);
    } else {
      return result || node;
    }
  }

  action(node) {
    return new Action(node.name, node.value);
  }

  behavior(node) {
    return new Behavior(node.events, node.conditions, node.actions);
  }
};

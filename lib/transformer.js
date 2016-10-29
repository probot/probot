const walk = require('tree-walk');
const Behavior = require('./behavior');
const actions = require('./actions');
const conditions = require('./conditions');
const LogicalExpression = require('./conditions/logical-expression');

// FIXME: refactor all actions into classes
class Action {
  constructor(name, value) {
    this.name = name;
    this.value = value;
  }

  call(github, payload) {
    if (!actions[this.name]) {
      throw new Error('Unknown action: ' + this.name);
    }
    // debug('action: %s', this.name, this.value);
    return actions[this.name](github, payload, this.value);
  }
}

// FIXME: refactor conditions into classes
class Condition {
  constructor(name, value) {
    this.name = name;
    this.value = value;
  }

  matches(github, payload) {
    if (!conditions[this.name]) {
      throw new Error('Unknown condition: ' + this.name);
    }
    // debug('condition: %s', this.name, this.value);
    return conditions[this.name](this.github, payload, this.value);
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
    return new Behavior(node.events, node.conditions || [], node.actions);
  }

  condition(node) {
    return new Condition(node.name, node.value);
  }

  LogicalExpression(node) {
    return new LogicalExpression(node.left, node.operator, node.right);
  }
};

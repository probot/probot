const walk = require('tree-walk');
const debug = require('debug')('PRobot');
const Behavior = require('./behavior');
const actions = require('./actions');
const conditions = require('./conditions');
const logicalExpression = require('./conditions/logical-expression');
const attribute = require('./conditions/attribute');

// FIXME: refactor all actions into classes
class Action {
  constructor(name, value) {
    this.name = name;
    this.value = value;
  }

  call(context) {
    if (!actions[this.name]) {
      throw new Error('Unknown action: ' + this.name);
    }
    debug('action: %s', this.name, this.value);
    return actions[this.name](context, this.value);
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
    } else if (node.type) {
      throw new Error('Unknown node: ' + node.type);
    } else {
      return result || node;
    }
  }

  event(node) {
    return node;
  }

  attribute(node) {
    return context => attribute(context, node.name);
  }

  action(node) {
    return new Action(node.name, node.value);
  }

  behavior(node) {
    return new Behavior(node.events, node.conditions || [], node.actions);
  }

  condition(node) {
    return context => {
      if (!conditions[node.name]) {
        throw new Error('Unknown condition: ' + node.name);
      }
      debug('condition: %s', node.name, node.value);
      return conditions[node.name](context, node.value);
    };
  }

  LogicalExpression(node) {
    return context => {
      return logicalExpression(context, node.left, node.operator, node.right);
    };
  }
};

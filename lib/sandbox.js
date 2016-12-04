const vm = require('vm');

class Sandbox {
  constructor(content) {
    this.content = content;
  }

  execute(api) {
    vm.createContext(api);
    vm.runInContext(this.content, api);
    return this.workflows;
  }
}

module.exports = Sandbox;

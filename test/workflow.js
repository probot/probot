const expect = require('expect');
const Plugin = require('../lib/plugin');
const Workflow = require('../lib/workflow');

class TestPlugin extends Plugin {
  doSomething(context, name, value) {
    context[name] = value;
  }

  rejectPromise() {
    return Promise.reject(new Error('HALT AND CATCH FIRE!!!'));
  }

  returnUndefined() {
    return undefined;
  }

  test() {
    return 'passed!';
  }

  throwError() {
    throw new Error('Nothing to see here, move along');
  }
}

describe('Workflow', () => {
  const context = {};
  let workflow;

  beforeEach(() => {
    workflow = new Workflow([new TestPlugin()]);
  });

  describe('construction', () => {
    it('adds the plugins distinctiveness to its own', () => {
      expect(workflow.api.test).toExist();
    });

    it('returns a reference to the API for chaining when the test function is called', () => {
      const api = workflow.api.test();

      expect(api).toBe(workflow.api);
    });
  });

  describe('execution', () => {
    it('returns a resolved promise with the ultimate value when everything works', () => {
      workflow.api.test();

      return workflow.execute(context).then(result => {
        expect(result).toBe('passed!');
      });
    });

    it('returns a rejected promise when a promise is rejected', () => {
      workflow.api.rejectPromise();

      return workflow.execute(context).catch(err => {
        expect(err.message).toBe('HALT AND CATCH FIRE!!!');
      });
    });

    it('returns a rejected promise when an error is thrown', () => {
      workflow.api.throwError();

      return workflow.execute(context).catch(err => {
        expect(err.message).toBe('Nothing to see here, move along');
      });
    });

    it('calls each chained function when things succeed', () => {
      workflow.api.doSomething('bar', 'baz').doSomething('baz', 'quux');

      return workflow.execute(context).then(() => {
        expect(context.bar).toBe('baz');
        expect(context.baz).toBe('quux');
      });
    });

    it('calls each chained function even if a falsy value is returned', () => {
      workflow.api.doSomething('bar', 'baz').returnUndefined().doSomething('baz', 'quux');

      return workflow.execute(context).then(() => {
        expect(context.bar).toBe('baz');
        expect(context.baz).toBe('quux');
      });
    });

    it('calls each chained function until a promise is rejected', () => {
      workflow.api.doSomething('bar', 'baz').rejectPromise().doSomething('baz', 'quux');

      return workflow.execute(context).then(() => {
        throw new Error('Should not happen');
      }, err => {
        expect(err.message).toBe('HALT AND CATCH FIRE!!!');
        expect(context.bar).toBe('baz');
        expect(context.baz).toNotExist();
      });
    });

    it('calls each chained function until an error is thrown', () => {
      workflow.api.doSomething('bar', 'baz').throwError().doSomething('baz', 'quux');

      return workflow.execute(context).then(() => {
        throw new Error('Should not happen');
      }, err => {
        expect(err.message).toBe('Nothing to see here, move along');
        expect(context.bar).toBe('baz');
        expect(context.baz).toNotExist();
      });
    });
  });
});

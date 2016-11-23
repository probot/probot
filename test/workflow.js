const expect = require('expect');
const Workflow = require('../lib/workflow');

describe('Workflow', () => {
  describe('matches', () => {
    it('is truthy for matching event', () => {
      const workflow = new Workflow(['issues']);
      expect(workflow.matches({event: 'issues', payload: {}})).toBeTruthy();
    });

    it('is truthy for multiple events', () => {
      const workflow = new Workflow(['issues', 'pull_request']);
      expect(workflow.matches({event: 'pull_request', payload: {}})).toBeTruthy();
    });

    it('is truthy for event with action', () => {
      const workflow = new Workflow(['issues.opened']);
      expect(
        workflow.matches({event: 'issues', payload: {action: 'opened'}})
      ).toBeTruthy();
    });

    it('is truthy for multiple events with action', () => {
      const workflow = new Workflow(['issues.opened', 'issues.labeled']);
      expect(
        workflow.matches({event: 'issues', payload: {action: 'labeled'}})
      ).toBeTruthy();
    });

    it('is falsy for different event', () => {
      const workflow = new Workflow(['issues']);
      expect(workflow.matches({event: 'pull_request', payload: {}})).toBeFalsy();
    });

    it('is falsy for different action', () => {
      const workflow = new Workflow(['issues.opened']);
      expect(
        workflow.matches({event: 'issues', payload: {action: 'labeled'}})
      ).toBeFalsy();
    });
  });
});

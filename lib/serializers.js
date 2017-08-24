module.exports = {
  repository: repository => repository.full_name,
  event: event => {
    if (typeof event !== 'object' || !event.payload) {
      return event
    } else {
      return {
        id: event.id,
        event: event.event,
        action: event.payload.action,
        repository: event.payload.repository && event.payload.repository.full_name
      }
    }
  },
  installation: installation => installation.account.login
}

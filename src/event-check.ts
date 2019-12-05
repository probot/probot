import { Application } from './application'
import { GitHubAPI } from './github'

const MESSAGES: {
  [key: string]: string[]
} = {
  DISABLE_EVENT_CHECK: ['You can disable event checking by setting the environment variable DISABLE_EVENT_CHECK to "true".'],
  ISSUE_REPORT: [
    'If this error persists, you can raise a bug report at:',
    '  - https://github.com/probot/probot/issues'
  ]
}

let appMetadata: ReturnType<GitHubAPI['apps']['getAuthenticated']> | null = null

let hasDisplayedFeatureDisabledWarning = false
function displayFeatureDisabledWarning (app: Application) {
  if (!hasDisplayedFeatureDisabledWarning) {
    app.log.debug('DISABLE_EVENT_CHECK is enabled in your environment. You will not be warned if your Probot app is attempting to listen to an event it is not subscribed to.')
  }

  hasDisplayedFeatureDisabledWarning = true
}

async function eventCheck (app: Application, eventName: string) {
  if ((process.env.DISABLE_EVENT_CHECK && process.env.DISABLE_EVENT_CHECK.toLowerCase() === 'true') || process.env.NODE_ENV === 'production') {
    displayFeatureDisabledWarning(app)
    return
  }

  await retrieveAppMeta(app)
  const baseEventName = eventName.split('.')[0]

  if (!(await isSubscribedToEvent(baseEventName))) {
    app.log.warn(`Your app is attempting to listen to the "${eventName}" event, but your GitHub app is not subscribed to the "${baseEventName}" event.`)
    // TODO: Add link to GitHub docs about how to modify the events a GitHub App
    // is subscribed to.
  }
}

async function isSubscribedToEvent (event: string) {
  if (event === '*') {
    return true
  }

  const events = (await retrieveAppMeta()).data.events
  console.log('retrieveAppMeta', await retrieveAppMeta())
  if (events.includes(event)) {
    return true
  }
  return false
}

async function retrieveAppMeta (app?: Application) {
  if (appMetadata) {
    return appMetadata
  }

  appMetadata = new Promise(async (resolve, reject) => {
    if (app === undefined) {
      return reject(new SyntaxError([
        'An unexpected error occurred with Probot\'s event-check feature.',
        ...MESSAGES.ISSUE_REPORT,
        '',
        ...MESSAGES.DISABLE_EVENT_CHECK
      ].join('\n')))
    }

    try {
      const api = await app.auth()
      const meta = await api.apps.getAuthenticated()
      return resolve(meta)
    } catch (e) {
      // If this error occurs, the application was unable to authenticate with
      // the GitHub API. It's most likely because the user has incorrectly
      // configured the environment variables (e.g. APP_ID, PRIVATE_KEY, etc.)
      // used for authentication between the Probot app and the GitHub API.
      return reject(new SyntaxError([
        'Probot is unable to retrieve application metadata information for event subscription checks.',
        '',
        'This may be an error with your application using incorrect configuration.',
        '',
        ...MESSAGES.DISABLE_EVENT_CHECK,
        '',
        ...MESSAGES.ISSUE_REPORT
      ].join('\n')))
    }
  })

  return appMetadata
}

export default eventCheck

import { Application } from './application'
import { GitHubAPI } from './github'

const MESSAGES: {
  [key: string]: string[]
} = {
  DISABLE_WEBHOOK_CHECK: ['You can disable webhook checking by setting the environment variable DISABLE_WEBHOOK_CHECK to "true".'],
  ISSUE_REPORT: [
    'If this error persists, you can raise a bug report at:',
    '  - https://github.com/probot/probot/issues'
  ]
}

let appMetadata: ReturnType<GitHubAPI['apps']['getAuthenticated']> | null = null

let hasDisplayedFeatureDisabledWarning = false
function displayFeatureDisabledWarning (app: Application) {
  if (!hasDisplayedFeatureDisabledWarning) {
    app.log.debug('DISABLE_WEBHOOK_CHECK is enabled in your environment. You will not be warned if your Probot app is attempting to listen to an event it is not subscribed to.')
  }

  hasDisplayedFeatureDisabledWarning = true
}

async function hookCheck (app: Application, eventName: string) {
  if ((process.env.DISABLE_WEBHOOK_CHECK && process.env.DISABLE_WEBHOOK_CHECK.toLowerCase() === 'true') || process.env.NODE_ENV === 'production') {
    displayFeatureDisabledWarning(app)
    return
  }

  await retrieveAppMeta(app)
  const baseEventName = eventName.split('.')[0]

  if (!(await isSubscribedToEvent(baseEventName))) {
    app.log.warn(`Your app is attempting to listen to the "${eventName}" event, but your app is not subscribed to the "${baseEventName}" webhook.`)
  }
}

async function isSubscribedToEvent (event: string) {
  if (event === '*') {
    return true
  }

  const events = (await retrieveAppMeta()).data.events

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
        'Probot is unable to retrieve application metadata information for webhook checking.',
        ...MESSAGES.ISSUE_REPORT,
        '',
        ...MESSAGES.DISABLE_WEBHOOK_CHECK
      ].join('\n')))
    }

    try {
      const api = await app.auth()
      const meta = await api.apps.getAuthenticated()
      return resolve(meta)
    } catch (e) {
      // If this error occurs, it's most likely because the user has
      // incorrectly setup authentication between the GitHub API/GitHub
      // Application and their Probot application.
      return reject(new SyntaxError([
        'Probot is unable to retrieve application metadata information for webhook subscription checks.',
        '',
        'This may be an error with your application using incorrect authentication configuration.',
        '',
        ...MESSAGES.DISABLE_WEBHOOK_CHECK,
        '',
        ...MESSAGES.ISSUE_REPORT
      ].join('\n')))
    }
  })

  return appMetadata
}

export default hookCheck

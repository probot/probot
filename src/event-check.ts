import { Application } from './application'
import { GitHubAPI } from './github'

let appMetadata: ReturnType<GitHubAPI['apps']['getAuthenticated']> | null = null

// To avoid displaying a message multiple times, we keep track of which messages
// have already been displayed.
const hasDisplayedWarning = {
  failedRetrievingMeta: false
}

/**
 * Check if `app` is subscribed to an event.
 *
 * @param {Application} app
 * @param {string} eventName
 * @returns Returns `true` if the app is subscribed to an event. Otherwise,
 * returns `false`. Returns `undefined` if the event-check feature is disabled.
 */
async function eventCheck (app: Application, eventName: string) {
  if (isEventCheckEnabled() === false) {
    return
  }

  const baseEventName = eventName.split('.')[0]
  if (!(await isSubscribedToEvent(app, baseEventName)) && !hasDisplayedWarning.failedRetrievingMeta) {
    app.log.error(`Your app is attempting to listen to the "${eventName}" event, but your GitHub App is not subscribed to the "${baseEventName}" event.`)
    return false
  }

  return true
}

/**
 * @param {Application} app
 * @param {string} baseEventName The base part of an event name refers to the
 * text of an event name before the first period mark (e.g. the `issues` part in
 * `issues.opened`).
 * @returns Returns `true` when the application is subscribed to a webhook
 * event. Otherwise, returns `false`.
 *
 *  **Return Caveat Notice:** This function will return `false` if event-check
 *  fails to retrieve subscribed event data. For that reason, it is recommended
 *  to also check `hasDisplayedWarning.failedRetrievingMeta` when handling
 *  `false` return values.
 */
async function isSubscribedToEvent (app: Application, baseEventName: string) {
  let events
  if (baseEventName === '*') {
    return true
  }

  try {
    events = (await retrieveAppMeta(app)).data.events
  } catch (e) {
    if (!hasDisplayedWarning.failedRetrievingMeta) {
      app.log.warn(e)
    }
    hasDisplayedWarning.failedRetrievingMeta = true
    return false
  }

  return events.includes(baseEventName)
}

async function retrieveAppMeta (app: Application) {
  if (appMetadata) return appMetadata

  appMetadata = new Promise(async (resolve, reject) => {
    const api = await app.auth()
    try {
      const meta = await api.apps.getAuthenticated()
      return resolve(meta)
    } catch (e) {
      app.log.trace(e)
      /**
       * There are a few reasons why Probot might be unable to retrieve
       * application metadata.
       *
       * - Probot may not be connected to the Internet.
       * - The GitHub API is not responding to requests (see
       *   https://www.githubstatus.com/).
       * - The user has incorrectly configured environment variables (e.g.
       *   APP_ID, PRIVATE_KEY, etc.) used for authentication between the Probot
       *   app and the GitHub API.
       */
      return reject([
        'Probot is unable to retrieve app information from GitHub for event subscription verification.',
        '',
        'If this error persists, feel free to report an issue at:',
        '  - https://github.com/probot/probot/issues'
      ].join('\n'))
    }
  })

  return appMetadata
}

function isEventCheckEnabled () {
  if (process.env.DISABLE_EVENT_CHECK && process.env.DISABLE_EVENT_CHECK.toLowerCase() === 'true') {
    return false
  } else if (process.env.NODE_ENV && process.env.NODE_ENV.toLowerCase() !== 'development') {
    return false
  }
  return true
}

export default eventCheck

/**
 * A helper function used by unit tests to reset the cached result of /app.
 */
export function resetMetadataCache () {
  appMetadata = null
}

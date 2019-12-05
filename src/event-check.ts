import { Application } from './application'
import { GitHubAPI } from './github'

let appMetadata: ReturnType<GitHubAPI['apps']['getAuthenticated']> | null = null

// To avoid displaying a message multiple times, we keep track of which messages
// have already been displayed.
const hasDisplayedWarning = {
  failedRetrievingMeta: false
}

async function eventCheck (app: Application, eventName: string) {
  if (isEventCheckEnabled() === false) {
    return
  }

  const baseEventName = eventName.split('.')[0]
  if (!(await isSubscribedToEvent(app, baseEventName)) && !hasDisplayedWarning.failedRetrievingMeta) {
    app.log.error(`Your app is attempting to listen to the "${eventName}" event, but your GitHub App is not subscribed to the "${baseEventName}" event.`)
  }
}

function isEventCheckEnabled () {
  if (process.env.DISABLE_EVENT_CHECK && process.env.DISABLE_EVENT_CHECK.toLowerCase() === 'true') {
    return false
  }

  if (process.env.NODE_ENV && process.env.NODE_ENV.toLowerCase() !== 'development') {
    return false
  }

  return true
}

/**
 * @param {Application} app
 * @param {string} baseEventName The base part of an event name refers to the
 * text of an event name before the first period mark (e.g. the `issues` part in
 * `issues.opened`).
 * @returns Returns `false` when it is known the application is not subscribed
 *  to the `baseEventName` event. Returns `true` in all other instances.
 *
 *  **Return Caveat Notice:** This function will return `true` if event-check
 *  fails to retrieve subscribed event data. For that reason, it is recommended
 *  to only treat `false` return values as accurate.
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
      return reject('Probot is unable to retrieve app information from GitHub for event subscription verification.')
    }
  })

  return appMetadata
}

export default eventCheck

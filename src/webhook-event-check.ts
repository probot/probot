import { Application } from './application'
import { GitHubAPI } from './github'

let appMeta: ReturnType<GitHubAPI['apps']['getAuthenticated']> | null = null
let didFailRetrievingAppMeta = false

/**
 * Check if an application is subscribed to an event.
 *
 * @returns Returns `false` if the app is not subscribed to an event. Otherwise,
 * returns `true`. Returns `undefined` if the webhook-event-check feature is
 * disabled or if Probot failed to retrieve the GitHub App's metadata.
 */
async function webhookEventCheck (app: Application, eventName: string) {
  if (isWebhookEventCheckEnabled() === false) {
    return
  }

  const baseEventName = eventName.split('.')[0]
  if (await isSubscribedToEvent(app, baseEventName)) {
    return true
  } else if (didFailRetrievingAppMeta === false) {
    const userFriendlyBaseEventName = baseEventName.split('_').join(' ')
    app.log.error(`Your app is attempting to listen to "${eventName}", but your GitHub App is not subscribed to the "${userFriendlyBaseEventName}" event.`)
  }
  return didFailRetrievingAppMeta ? undefined : false
}

/**
 * @param {string} baseEventName The base event name refers to the part before
 * the first period mark (e.g. the `issues` part in `issues.opened`).
 * @returns Returns `true` when the application is subscribed to a webhook
 * event. Otherwise, returns `false`. Returns `undefined` if Probot failed to
 * retrieve GitHub App metadata.
 *
 * **Note**: Probot  will only check against a list of events known to be in the
 * `/app` response. Therefore, only the `false` value returned should be
 * considered truthy.
 */
async function isSubscribedToEvent (app: Application, baseEventName: string) {
  // A list of events known to be in the response of `/app`. This list can be
  // retrieved by calling `GET /app` from an authenticated app that has maximum
  // permissions and is subscribed to all available webhook events.
  const knownBaseEvents = [
    'check_run',
    'check_suite',
    'commit_comment',
    'content_reference',
    'create',
    'delete',
    'deployment',
    'deployment_status',
    'deploy_key',
    'fork',
    'gollum',
    'issues',
    'issue_comment',
    'label',
    'member',
    'membership',
    'milestone',
    'organization',
    'org_block',
    'page_build',
    'project',
    'project_card',
    'project_column',
    'public',
    'pull_request',
    'pull_request_review',
    'pull_request_review_comment',
    'push',
    'release',
    'repository',
    'repository_dispatch',
    'star',
    'status',
    'team',
    'team_add',
    'watch'
  ]

  // Because `/app` does not include many events - such as events that all
  // GitHub Apps are subscribed to by default (e.g.`installation`, `meta, or
  // `marketplace_purchase`) - we can't compare `baseEventName` to the results
  // of `GET /app`. Instead, we will return `true`.
  if (!knownBaseEvents.includes(baseEventName)) {
    return true
  }

  let events
  try {
    events = (await retrieveAppMeta(app)).data.events
  } catch (e) {
    if (!didFailRetrievingAppMeta) {
      app.log.warn(e)
    }
    didFailRetrievingAppMeta = true
    return
  }

  return events.includes(baseEventName)
}

async function retrieveAppMeta (app: Application) {
  if (appMeta) return appMeta

  appMeta = new Promise(async (resolve, reject) => {
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
        'If this error persists, feel free to raise an issue at:',
        '  - https://github.com/probot/probot/issues'
      ].join('\n'))
    }
  })

  return appMeta
}

function isWebhookEventCheckEnabled () {
  if (process.env.DISABLE_WEBHOOK_EVENT_CHECK && process.env.DISABLE_WEBHOOK_EVENT_CHECK.toLowerCase() === 'true') {
    return false
  } else if (process.env.NODE_ENV && process.env.NODE_ENV.toLowerCase() === 'production') {
    return false
  }
  return true
}

export default webhookEventCheck

/**
 * A helper function used in testing that resets the cached result of /app.
 */
export function clearCache () {
  appMeta = null
  didFailRetrievingAppMeta = false
}

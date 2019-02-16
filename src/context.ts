import Webhooks, { PayloadRepository } from '@octokit/webhooks'
import yaml from 'js-yaml'
import path from 'path'
import { GitHubAPI } from './github'
import { LoggerWithTarget } from './wrap-logger'

interface WebhookPayloadWithRepository {
  [key: string]: any
  repository?: PayloadRepository
  issue?: {
    [key: string]: any
    number: number
    html_url?: string
    body?: string
  }
  pull_request?: {
    [key: string]: any
    number: number
    html_url?: string
    body?: string
  }
  sender?: {
    [key: string]: any
    type: string
  }
  action?: string
  installation?: {
    id: number
    [key: string]: any
  }
}

/**
 * The context of the event that was triggered, including the payload and
 * helpers for extracting information can be passed to GitHub API calls.
 *
 *  ```js
 *  module.exports = app => {
 *    app.on('push', context => {
 *      context.log('Code was pushed to the repo, what should we do with it?');
 *    });
 *  };
 *  ```
 *
 * @property {github} github - A GitHub API client
 * @property {payload} payload - The webhook event payload
 * @property {logger} log - A logger
 */

export class Context<E extends WebhookPayloadWithRepository = any> implements Webhooks.WebhookEvent<E> {
  public name: string
  public id: string
  public payload: E
  public protocol?: 'http' | 'https'
  public host?: string
  public url?: string

  public github: GitHubAPI
  public log: LoggerWithTarget

  constructor (event: Webhooks.WebhookEvent<E>, github: GitHubAPI, log: LoggerWithTarget) {
    this.name = event.name
    this.id = event.id
    this.payload = event.payload
    this.protocol = event.protocol
    this.host = event.host
    this.url = event.url

    this.github = github
    this.log = log
  }

  // Maintain backward compatibility
  public get event (): string {
    return this.name
  }

  /**
   * Return the `owner` and `repo` params for making API requests against a
   * repository.
   *
   * ```js
   * const params = context.repo({path: '.github/config.yml'})
   * // Returns: {owner: 'username', repo: 'reponame', path: '.github/config.yml'}
   * ```
   *
   * @param object - Params to be merged with the repo params.
   *
   */
  public repo<T> (object?: T) {
    const repo = this.payload.repository

    if (!repo) {
      throw new Error('context.repo() is not supported for this webhook event.')
    }

    return Object.assign({
      owner: repo.owner.login || repo.owner.name!,
      repo: repo.name
    }, object)
  }

  /**
   * Return the `owner`, `repo`, and `number` params for making API requests
   * against an issue or pull request. The object passed in will be merged with
   * the repo params.
   *
   * ```js
   * const params = context.issue({body: 'Hello World!'})
   * // Returns: {owner: 'username', repo: 'reponame', number: 123, body: 'Hello World!'}
   * ```
   *
   * @param object - Params to be merged with the issue params.
   */
  public issue<T> (object?: T) {
    const payload = this.payload
    return Object.assign({
      number: (payload.issue || payload.pull_request || payload).number
    }, this.repo(object))
  }

  /**
   * Returns a boolean if the actor on the event was a bot.
   * @type {boolean}
   */
  get isBot () {
    return this.payload.sender!.type === 'Bot'
  }

  /**
   * Reads the app configuration from the given YAML file in the `.github`
   * directory of the repository.
   *
   * For example, given a file named `.github/config.yml`:
   *
   * ```yml
   * close: true
   * comment: Check the specs on the rotary girder.
   * ```
   *
   * Your app can read that file from the target repository:
   *
   * ```js
   * // Load config from .github/config.yml in the repository
   * const config = await context.config('config.yml')
   *
   * if (config.close) {
   *   context.github.issues.comment(context.issue({body: config.comment}))
   *   context.github.issues.edit(context.issue({state: 'closed'}))
   * }
   * ```
   *
   * You can also use a `defaultConfig` object:
   *
   * ```js
   * // Load config from .github/config.yml in the repository and combine with default config
   * const config = await context.config('config.yml', {comment: 'Make sure to check all the specs.'})
   *
   * if (config.close) {
   *   context.github.issues.comment(context.issue({body: config.comment}));
   *   context.github.issues.edit(context.issue({state: 'closed'}))
   * }
   * ```
   *
   * @param fileName - Name of the YAML file in the `.github` directory
   * @param defaultConfig - An object of default config options
   * @return Configuration object read from the file
   */
  public async config<T> (fileName: string, defaultConfig?: T) {
    const params = this.repo({ path: path.posix.join('.github', fileName) })

    try {
      const res = await this.github.repos.getContents(params)
      const config = yaml.safeLoad(Buffer.from(res.data.content, 'base64').toString()) || {}
      return Object.assign({}, defaultConfig, config)
    } catch (err) {
      if (err.code === 404) {
        if (defaultConfig) {
          return defaultConfig
        }
        return null
      } else {
        throw err
      }
    }
  }
}

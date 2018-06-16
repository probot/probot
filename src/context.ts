import yaml from 'js-yaml'
import path from 'path'
import {GitHubAPI} from './github'
import {LoggerWithTarget} from './wrap-logger'
/**
 * Helpers for extracting information from the webhook event, which can be
 * passed to GitHub API calls.
 *
 * @property {github} github - A GitHub API client
 * @property {payload} payload - The webhook event payload
 * @property {logger} log - A logger
 */
export class Context {
  public id: number
  public github: GitHubAPI
  public log: LoggerWithTarget
  public payload!: WebhookPayloadWithRepository
  public event: any

  constructor (event:any, github:GitHubAPI, log:LoggerWithTarget) {
    Object.assign(this, event)
    this.event = event
    this.id = event.id
    this.github = github
    this.log = log
  }

  /**
   * Return the `owner` and `repo` params for making API requests against a
   * repository.
   *
   * @param {object} [object] - Params to be merged with the repo params.
   *
   * @example
   *
   * const params = context.repo({path: '.github/config.yml'})
   * // Returns: {owner: 'username', repo: 'reponame', path: '.github/config.yml'}
   *
   */
  public repo<T> (object?: T) {
    const repo = this.payload.repository

    if (!repo) {
      throw new Error('context.repo() is not supported for this webhook event.')
    }

    return Object.assign({
      owner: repo.owner.login || repo.owner.name,
      repo: repo.name
    }, object)
  }

  /**
   * Return the `owner`, `repo`, and `number` params for making API requests
   * against an issue or pull request. The object passed in will be merged with
   * the repo params.
   *
   * @example
   *
   * const params = context.issue({body: 'Hello World!'})
   * // Returns: {owner: 'username', repo: 'reponame', number: 123, body: 'Hello World!'}
   *
   * @param {object} [object] - Params to be merged with the issue params.
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
    return this.payload.sender.type === 'Bot'
  }

  /**
   * Reads the app configuration from the given YAML file in the `.github`
   * directory of the repository.
   *
   * @example <caption>Contents of <code>.github/config.yml</code>.</caption>
   *
   * close: true
   * comment: Check the specs on the rotary girder.
   *
   * @example <caption>App that reads from <code>.github/config.yml</code>.</caption>
   *
   * // Load config from .github/config.yml in the repository
   * const config = await context.config('config.yml')
   *
   * if (config.close) {
   *   context.github.issues.comment(context.issue({body: config.comment}))
   *   context.github.issues.edit(context.issue({state: 'closed'}))
   * }
   *
   * @example <caption>Using a <code>defaultConfig</code> object.</caption>
   *
   * // Load config from .github/config.yml in the repository and combine with default config
   * const config = await context.config('config.yml', {comment: 'Make sure to check all the specs.'})
   *
   * if (config.close) {
   *   context.github.issues.comment(context.issue({body: config.comment}));
   *   context.github.issues.edit(context.issue({state: 'closed'}))
   * }
   *
   * @param {string} fileName - Name of the YAML file in the `.github` directory
   * @param {object} [defaultConfig] - An object of default config options
   * @return {Promise<Object>} - Configuration object read from the file
   */
  public async config<T> (fileName: string, defaultConfig?: T) {
    const params = this.repo({path: path.posix.join('.github', fileName)})

    try {
      const res = await this.github.repos.getContent(params)
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

export interface PayloadRepository {
  [key: string]: any
  full_name: string
  name: string
  owner: {
    [key: string]: any
    login: string
    name: string
  }
  html_url: string
}

export interface WebhookPayloadWithRepository {
  [key: string]: any
  repository: PayloadRepository
  issue: {
    [key: string]: any
    number: number
    html_url: string
    body: string
  }
  pull_request: {
    [key: string]: any
    number: number
    html_url: string
    body: string
  }
  sender: {
    [key: string]: any
    type: string
  }
  action: string
  installation: {
    id: number
    [key: string]: any
  }
}

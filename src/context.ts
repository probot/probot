import { Octokit } from '@octokit/rest'
import Webhooks, { PayloadRepository } from '@octokit/webhooks'
import merge from 'deepmerge'
import yaml from 'js-yaml'
import path from 'path'
import { GitHubAPI } from './github'
import { LoggerWithTarget } from './wrap-logger'

const CONFIG_PATH = '.github'
const BASE_KEY = '_extends'
const BASE_REGEX = new RegExp(
  '^' +
  '(?:([a-z\\d](?:[a-z\\d]|-(?=[a-z\\d])){0,38})/)?' + // org
  '([-_.\\w\\d]+)' + // project
  '(?::([-_./\\w\\d]+\\.ya?ml))?' + // filename
    '$',
  'i'
)
const DEFAULT_BASE = '.github'

export type MergeOptions = merge.Options

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
   * Config files can also specify a base that they extend. `deepMergeOptions` can be used
   * to configure how the target config, extended base, and default configs are merged.
   *
   * For security reasons, configuration is only loaded from the repository's default branch, 
   * changes made in pull requests from different branches or forks are ignored.
   *
   * @param fileName - Name of the YAML file in the `.github` directory
   * @param defaultConfig - An object of default config options
   * @param deepMergeOptions - Controls merging configs (from the [deepmerge](https://github.com/TehShrike/deepmerge) module)
   * @return Configuration object read from the file
   */
  public async config<T> (fileName: string, defaultConfig?: T, deepMergeOptions?: MergeOptions): Promise<object | null> {
    const params = this.repo({ path: path.posix.join(CONFIG_PATH, fileName) })
    const config = await this.loadYaml(params)

    let baseRepo
    if (config == null) {
      baseRepo = DEFAULT_BASE
    } else if (config != null && BASE_KEY in config) {
      baseRepo = config[BASE_KEY]
      delete config[BASE_KEY]
    }

    let baseConfig
    if (baseRepo) {
      if (typeof baseRepo !== 'string') {
        throw new Error(`Invalid repository name in key "${BASE_KEY}"`)
      }

      const baseParams = this.getBaseParams(params, baseRepo)
      baseConfig = await this.loadYaml(baseParams)
    }

    if (config == null && baseConfig == null && !defaultConfig) {
      return null
    }

    return merge.all(
      // filter out null configs
      [defaultConfig, baseConfig, config].filter(conf => conf),
      deepMergeOptions
    )
  }

  /**
   * Loads a file from GitHub
   *
   * @param params Params to fetch the file with
   * @return The parsed YAML file
   */
  private async loadYaml<T> (params: Octokit.ReposGetContentsParams): Promise<any> {
    try {
      const response = await this.github.repos.getContents(params)

      // Ignore in case path is a folder
      // - https://developer.github.com/v3/repos/contents/#response-if-content-is-a-directory
      if (Array.isArray(response.data)) {
        return null
      }

      // we don't handle symlinks or submodule
      // - https://developer.github.com/v3/repos/contents/#response-if-content-is-a-symlink
      // - https://developer.github.com/v3/repos/contents/#response-if-content-is-a-submodule
      if (typeof response.data.content !== 'string') {
        return
      }

      return yaml.safeLoad(Buffer.from(response.data.content, 'base64').toString()) || {}
    } catch (e) {
      if (e.status === 404) {
        return null
      }

      throw e
    }
  }

  /**
   * Computes parameters for the repository specified in base
   *
   * Base can either be the name of a repository in the same organization or
   * a full slug "organization/repo".
   *
   * @param params An object containing owner, repo and path
   * @param base A string specifying the base repository
   * @return The params of the base configuration
   */
  private getBaseParams (params: Octokit.ReposGetContentsParams, base: string): Octokit.ReposGetContentsParams {
    const match = base.match(BASE_REGEX)
    if (match === null) {
      throw new Error(`Invalid repository name in key "${BASE_KEY}": ${base}`)
    }

    return {
      owner: match[1] || params.owner,
      path: match[3] || params.path,
      repo: match[2]
    }
  }
}

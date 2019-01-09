declare module '@octokit/plugin-enterprise-compatibility' {
  import Octokit from '@octokit/rest'
  declare function plugin(octokit: Octokit, options: Octokit.Options): void
  export = plugin
}
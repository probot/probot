declare module '@octokit/plugin-retry' {
  import Octokit from '@octokit/rest'
  declare function plugin(octokit: Octokit, options: Octokit.Options): void
  export = plugin
}
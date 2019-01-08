declare module '@octokit/graphql/lib/with-defaults' {
  import Octokit from '@octokit/rest'

  export = withDefaults
  declare function withDefaults(request: Octokit.request, defaults: Octokit.EndpointOptions): any;
}

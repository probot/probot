declare module "octokit-pagination-methods/lib/has-next-page" {
  import Octokit from '@octokit/rest'

  function hasNextPage (...args: any[]): Promise<Octokit.AnyResponse>
  export = hasNextPage
}

declare module "octokit-pagination-methods/lib/get-next-page" {
  import Octokit from '@octokit/rest'

  function getNextPage (...args: any[]): Promise<Octokit.AnyResponse>
  export = getNextPage
}

import Octokit from '@octokit/rest'

// tslint:disable-next-line
const octokitGetNextPage = require('octokit-pagination-methods/lib/get-next-page')
// tslint:disable-next-line
const octokitHasNextPage = require('octokit-pagination-methods/lib/has-next-page')

export function addPagination (octokit: Octokit) {
  const octokitPaginate = octokit.paginate

  octokit.paginate = Object.assign(
    (...args: any[]) => paginate(octokit, octokitPaginate, args[0], args[1], args[2]),
    { iterator: octokit.paginate.iterator }
  )
}

const defaultCallback = (response: Octokit.AnyResponse, done?: () => void) => response

async function paginate (octokit: Octokit, octokitPaginate: Octokit.Paginate, ...args: any[]) {
  // Until we fully deprecate the old paginate method, we need to check if the
  // first argument. If it is a promise we return the old function signature
  if (!args[0].then) {
    return octokitPaginate(args[0], args[1], args[2])
  }

  const responsePromise = args[0]
  const callback = args[1] || defaultCallback

  // Deprecated since 8.0.0
  // tslint:disable-next-line:no-console
  console.warn(new Error(`.paginate(promise) is deprecated. Use .paginate(endpointOptions) instead.

For example, instead of

    context.github.paginate(context.github.issues.getAll(context.repo())

do

    context.github.paginate(context.github.issues.getAll.endpoint.merge(context.repo())

Note that when using the new syntax, the responses will be mapped to its data only by default.

See https://probot.github.io/docs/pagination/`))
  let collection: any[] = []
  let getNextPage = true

  const done = () => {
    getNextPage = false
  }

  let response = await responsePromise

  collection = collection.concat(callback(response, done))

  // eslint-disable-next-line no-unmodified-loop-condition
  while (getNextPage && octokitHasNextPage(response)) {
    response = await octokitGetNextPage(octokit, response)
    collection = collection.concat(callback(response, done))
  }
  return collection
}

import { AnyResponse } from '@octokit/rest'
import { GitHubAPI } from './'

export function addPagination (octokit: GitHubAPI) {
  octokit.paginate = paginate.bind(null, octokit)
}

const defaultCallback = (response: Promise<AnyResponse>, done?: () => void) => response

async function paginate (octokit: GitHubAPI, responsePromise: any, callback = defaultCallback) {
  let collection: any[] = []
  let getNextPage = true

  const done = () => {
    getNextPage = false
  }

  let response = await responsePromise

  collection = collection.concat(await callback(response, done))

  // eslint-disable-next-line no-unmodified-loop-condition
  while (getNextPage && octokit.hasNextPage(response)) {
    response = await octokit.getNextPage(response)
    collection = collection.concat(await callback(response, done))
  }
  return collection
}

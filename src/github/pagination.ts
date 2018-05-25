export function addPagination (octokit) {
  octokit.paginate = paginate.bind(null, octokit)
}

const defaultCallback = (response, done?) => response

async function paginate (octokit, responsePromise, callback = defaultCallback) {
  let collection = []
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

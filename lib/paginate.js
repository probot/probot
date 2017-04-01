/* eslint-disable no-await-in-loop */

// Default callback should just return the response passed to it.
const defaultCallback = response => response;

module.exports = async function (responsePromise, callback = defaultCallback) {
  let collection = [];
  let response = await responsePromise;

  collection = collection.concat(await callback(response));

  while (this.hasNextPage(response)) {
    response = await this.getNextPage(response);
    collection = collection.concat(await callback(response));
  }

  return collection;
};

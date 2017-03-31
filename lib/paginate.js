/* eslint-disable no-await-in-loop */

module.exports = async function (responsePromise, callback) {
  let collection = [];
  let response = await responsePromise;

  collection = collection.concat(await callback(response));

  while (this.hasNextPage(response)) {
    response = await this.getNextPage(response);
    collection = collection.concat(await callback(response));
  }

  return collection;
};

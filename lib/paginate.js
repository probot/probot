/* eslint-disable no-await-in-loop */

module.exports = async function (responsePromise, callback) {
  let response = await responsePromise;
  let collection = await callback(response);

  while (this.hasNextPage(response)) {
    response = await this.getNextPage(response);
    collection = collection.concat(await callback(response));
  }

  return collection;
};

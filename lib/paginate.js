module.exports = async function paginate(responsePromise, callback) {
  let response = await responsePromise;
  let collection = await callback(response);

  while (this.hasNextPage(response)) {
    response = await this.getNextPage(response);
    collection = collection.concat(await callback(response));
  }

  return collection;
}

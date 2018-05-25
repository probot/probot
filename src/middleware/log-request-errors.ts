
module.exports = (err: Error, req, res, next) => {
  req.log.error(err)
  next()
}

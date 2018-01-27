module.exports = (err, req, res, next) => {
  req.log.error(err)
  next()
}

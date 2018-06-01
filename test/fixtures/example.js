module.exports = app => {
  app.log('loaded app')

  app.on('issue_comment.created', context => {
    context.log('Comment created')
  })
}

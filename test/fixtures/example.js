module.exports = robot => {
  robot.log('loaded app')

  robot.on('issue_comment.created', context => {
    context.log('Comment created')
  })
}

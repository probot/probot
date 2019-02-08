import { Application } from '../../src/application'

export = (app: Application) => {
  app.log('loaded app')

  app.on('issue_comment.created', context => {
    context.log('Comment created')
  })
}

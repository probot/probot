import { Application } from '../../src/application'

export = (app: Application) => {
  app.log('loaded app')

  app.on('issue_comment.created', async context => {
    context.log('Comment created')
  })
}

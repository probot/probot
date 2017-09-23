---
next: docs/extensions.md
---

# Pagination

Many GitHub API endpoints are paginated. The `github.paginate` method can be used to get each page of the results.

```js
module.exports = robot => {
  robot.on('issues.opened', context => {
    context.github.paginate(context.github.issues.getAll(context.repo()), res => {
      res.data.issues.forEach(issue => {
        robot.console.log('Issue: %s', issue.title)
      })
    })
  })
}
```

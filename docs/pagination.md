---
next: docs/extensions.md
---

# Pagination

Many GitHub API endpoints are paginated. The `github.paginate` method can be used to get each page of the results.

```js
module.exports = robot => {
  robot.on('issues.opened', context => {
    context.github.paginate(
      context.github.issues.getAll(context.repo()),
      res => {
        res.data.issues.forEach(issue => {
          context.log('Issue: %s', issue.title)
        })
      }
    )
  })
}
```

## Accumulating pages

The return value of the `github.paginate` callback will be used to accumulate results.

```js
module.exports = robot => {
  robot.on('issues.opened', async context => {
    const allIssues = await context.github.paginate(
      context.github.issues.getAll(context.repo()),
      res => res.data
    )
    console.log(allIssues)
  })
}
```

## Early exit

Sometimes it is desirable to stop fetching pages after a certain condition has been satisfied. A second argument, `done`, is provided to the callback and can be used to stop pagination. After `done` is invoked, no additional pages will be fetched.

```js
module.exports = robot => {
  robot.on('issues.opened', context => {
    context.github.paginate(
      context.github.issues.getAll(context.repo()),
      (res, done) => {
        for (let issue of res.data) {
          if (issue.body.includes('something')) {
            console.log('found it:', issue)
            done()
          }
        }
      }
    )
  })
}
```

---
next: docs/extensions.md
---

# Pagination

Many GitHub API endpoints are paginated. The `github.paginate` method can be used to get each page of the results.

```js
module.exports = app => {
  app.on('issues.opened', context => {
    context.github.paginate(
      context.github.issues.getAll.endpoint.merge(context.repo()),
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
module.exports = app => {
  app.on('issues.opened', async context => {
    const allIssues = await context.github.paginate(
      context.github.issues.getAll.endpoint.merge(context.repo()),
      res => res.data
    )
    console.log(allIssues)
  })
}
```

## Early exit

Sometimes it is desirable to stop fetching pages after a certain condition has been satisfied. A second argument, `done`, is provided to the callback and can be used to stop pagination. After `done` is invoked, no additional pages will be fetched, but you still need to return the mapped value for the current page request.

```js
module.exports = app => {
  app.on('issues.opened', context => {
    const options = context.github.issues.getAll.endpoint.merge(context.repo())
    context.github.paginate(options, (res, done) => {
      for (let issue of res.data) {
        if (issue.body.includes('something')) {
          console.log('found it:', issue)
          done()
          break
        }
      }
    })
  })
}
```

## Async iterators

If your runtime environment supports async iterators (such as Node 10+), you can iterate through each response

```js
module.exports = app => {
  app.on('issues.opened', async context => {
    const options = context.github.issues.getAll.endpoint.merge(context.repo())
    for await (const response of octokit.paginate.iterator(options)) {
      for (let issue of res.data) {
        if (issue.body.includes('something')) {
          return console.log('found it:', issue)
        }
      }
    }
  })
}
```

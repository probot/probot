---
next: docs/deployment.md
---

# Pagination

Many GitHub API endpoints are paginated. The `github.paginate` method can be used to get each page of the results.

```js
context.github.paginate(context.github.issues.getAll(context.repo()), res => {
  res.data.issues.forEach(issue => {
    robot.console.log('Issue: %s', issue.title);
  });
});
```

// Delete :+1: comments
const singleEmoji = /^\W*(:[\w-\+]+:|[\uE000-\uF8FF]|\uD83C[\uDF00-\uDFFF]|\uD83D[\uDC00-\uDDFF])\W*$/g;
on('issue_comment.created')
  .filter(event => event.payload.comment.body.match(singleEmoji))
  .deleteComment();

function isDeleted(event) {
  return event.payload.action === 'deleted' &&
  event.payload.sender.type !== 'Bot';
}

// restore deleted comments but the one deleted by PRobot
on('issue_comment', 'commit_comment', 'pull_request_review_comment')
.filter(isDeleted)
.comment(`
Hi @{{ sender.login }}. Please do not delete comments.
Deleted comment from {{ comment.user.login }} at {{ comment.updated_at }} was
{{ comment.body }}
`);

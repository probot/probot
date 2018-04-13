---
next: docs/http.md
---

# Events and Actions

There are many events on GitHub which gets subscribed to webhooks. One of these events is triggered, GitHub sends a HTTP POST payload to the webhook's configured URL.

While configuring a webhook, one can choose which events you would like to receive payloads for. Only subscribing to the specific events you plan on handling is useful for limiting the number of HTTP requests to your server. You can even opt-in to all current and future events. You can change the list of subscribed events through the API or UI anytime. 

Also, each event corresponds to a certain set of actions that can happen to your organization and/or repository.

For an exaple, let us consider the following code snippet:

```javascript
module.exports = robot => {
  robot.on('issues.opened', async context => {
    // A new issue was opened, what should we do with it?
    // `issues` is the event here,
    // `opened` is the action associated with the event here
  })
}
```
Here, `issues` is the event and `opened` is the action associated with the event.

Given below is a list of GitHub webhook events and actions related to the events.
  - [`*`](#-wildcard-event)
  - [`commit_comment`](#commit_comment)
  - [`create`](#create)
  - [`delete`](#delete)
  - [`deployment`](#deployment)
  - [`deployment_status`](#deployment_status)
  - [`fork`](#fork)
  - [`gollum`](#gollum)
  - [`installation`](#installation)
  - [`installation_repositories`](#installation_repositories)
  - [`issue_comment`](#issue_comment)
  - [`issues`](#issues)
  - [`label`](#label)
  - [`marketplace_purchase`](#marketplace_purchase)
  - [`member`](#member)
  - [`membership`](#membership)
  - [`milestone`](#milestone)
  - [`organization`](#organization)
  - [`org_block`](#org_block)
  - [`page_build`](#page_build)
  - [`ping`](#ping)
  - [`project_card`](#project_card)
  - [`project_column`](#project_column)
  - [`project`](#project)
  - [`public`](#public)
  - [`pull_request_review_comment`](#pull_request_review_comment)
  - [`pull_request_review`](#pull_request_review)
  - [`pull_request`](#pull_request)
  - [`push`](#push)
  - [`repository`](#repository)
  - [`release`](#release)
  - [`status`](#status)
  - [`team`](#team)
  - [`team_add`](#team_add)
  - [`watch`](#watch)

## `*` (Wildcard Event)
It is the [Wildcard Event](https://developer.github.com/webhooks/#wildcard-event). It matches all supported events. When you add the wildcard event, it will replace any existing events you have configured with the wildcard event and send you payloads for all supported events. One will also automatically get any new events that Developers at GitHub might add in the future.
[Additional information about `*` (Wildcard Event)](https://developer.github.com/webhooks/#wildcard-event)

## `commit_comment`
This event is triggered when a commit is commented on.

Action | Description | Syntax
-------|-------------|--------
`created` | This action is triggered when a comment on a comment is created. | `commit_comment.created`

[Additional information about `commit_comment`](https://developer.github.com/v3/activity/events/types/#commitcommentevent)

## `create`
This event is triggered when a Branch or Tag is created.

[Additional information about `create`](https://developer.github.com/v3/activity/events/types/#createevent)

## `delete`
This event is triggered when a Branch or Tag is deleted.

[Additional information about `delete`](https://developer.github.com/v3/activity/events/types/#deleteevent)

## `deployment`
This event is triggered when a Repository has a new deployment created from the API.

[Additional information about `deployment`](https://developer.github.com/v3/activity/events/types/#deploymentevent)


## `deployment_status`
This event is triggered when  a deployment for a Repository has a status update from the API.

[Additional information about `deployment_status`](https://developer.github.com/v3/activity/events/types/#deploymentstatusevent)


## `fork`
This event is triggered when a Repository is forked.

[Additional information about `fork`](https://developer.github.com/v3/activity/events/types/#forkevent)

## `gollum`
This event is triggered when a Wiki page is updated.

[Additional information about `gollum`](https://developer.github.com/v3/activity/events/types/#gollumevent)

## `installation`
This event is triggered when a GitHub App is installed or uninstalled.

Action | Description | Syntax
-------|-------------|--------
`created` | The action is triggered when a GitHub app is installed. | `installation.created`
`deleted` | The action is triggered when a GitHub app is uninstalled | `installation.deleted`

[Additional information about `installation`](https://developer.github.com/v3/activity/events/types/#installationevent)

## `installation_repositories`
This event is triggered when a repository is added or removed from an installation.

Action | Description | Syntax
-------|-------------|--------
`added` | This action is triggered when a repository is added from an installation. | `installation_repositories.added`
`removed` | This action is triggered when a repository is removed from an installation. | `installation_repositories.removed`

[Additional information about `installation_repositories`](https://developer.github.com/v3/activity/events/types/#installationrepositoriesevent)

## `issue_comment`
This event is triggered when a repository is added or removed from an installation.

Action | Description | Syntax
-------|-------------|--------
`created` | This action is triggered when a repository is added from an installation. | `issue_comment.created`
`deleted` | This action is triggered when a repository is removed from an installation.  | `issue_comment.deleted`
`edited` | This action is triggered when a repository is edited from an installation. | `issue_comment.edited`

[Additional information about `issue_comment`](https://developer.github.com/v3/activity/events/types/#issuecommentevent)

## `issues`
This event is triggered when a comment on an issue is created, edited, or deleted.

Action | Description | Syntax
-------|-------------|--------
`assigned` | This action is triggered when an issue is assigned| `issues.assigned`
`closed` | This action is triggered when an issue is closed | `issues.closed`
`demilestoned` | This action is triggered when an issue is demilestoned  | `issues.demilestoned`
`edited` | This action is triggered when an issue is edited | `issues.edited`
`labeled` | This action is triggered when an issue is labeled | `issues.labeled`
`milestoned` | This action is triggered when an issue is milestoned | `issues.milestoned`
`opened` | This action is triggered when an issue is opened | `issues.opened`
`reopened` | This action is triggered when an issue is reopened | `issues.reopened`
`unassigned` | This action is triggered when an issue is unassigned | `issues.unassigned`
`unlabeled` | This action is triggered when an issue is unlabeled | `issues.unlabeled`

[Additional information about `issues`](https://developer.github.com/v3/activity/events/types/#issuesevent)

## `label`
This event is triggered when a Label is created, edited, or deleted.

Action | Description | Syntax
-------|-------------|--------
`created`| This action is triggered when a Label is created. | `issues.created`
`deleted`| This action is triggered when a Label is deleted. | `issues.deleted`
`edited`| This action is triggered when a Label is edited. | `issues.edited`

[Additional information about `label`](https://developer.github.com/v3/activity/events/types/#labelevent)

## `marketplace_purchase`
This event is triggered when a user purchases, cancels, or changes their [GitHub Marketplace](https://github.com/marketplace/) plan.

Action | Description | Syntax
-------|-------------|--------
`cancelled` | This action is triggered when a user cancels their [GitHub Marketplace](https://github.com/marketplace/) plan. | `marketplace_purchase.cancelled`
`changed` |  This action is triggered when a user changes their [GitHub Marketplace](https://github.com/marketplace/) plan. | `marketplace_purchase.changed`
`purchased` |  This action is triggered when a user purchases their [GitHub Marketplace](https://github.com/marketplace/) plan. | `marketplace_purchase.purchased`

[Additional information about `marketplace_purchase`](https://developer.github.com/v3/activity/events/types/#marketplacepurchaseevent)

## `member`
This event is triggered when a User is added or removed as a collaborator to a Repository, or has their permissions modified.

Action | Description | Syntax
-------|-------------|--------
`added` | This action is triggered when a User is added  as a collaborator to a Repository. | `member.added` 
`deleted` | This action is triggered when a User is added as a collaborator to a Repository. | `member.deleted` 
`edited` | This action is triggered when a User has their permissions modified. | `member.edited` 

[Additional information about `member`](https://developer.github.com/v3/activity/events/types/#memberevent)

## `membership`
This event is triggered when  a User is added or removed from a team. Organization hooks only.

Action | Description | Syntax
-------|-------------|--------
`added` | This action is triggered when  a User is added from a team. | `membership.added`
`removed` | This action is triggered when  a User is removed from a team.  | `membership.removed`

[Additional Information about `membership`](https://developer.github.com/v3/activity/events/types/#membershipevent)

## `milestone`
This event is triggered when a Milestone is created, closed, opened, edited, or deleted.

Action | Description | Syntax
-------|-------------|--------
`closed` | This action is triggered when a Milestone is closed. | `milestone.closed`
`created` | This action is triggered when a Milestone is created. | `milestone.created`
`deleted` | This action is triggered when a Milestone is deleted. | `milestone.deleted`
`edited` | This action is triggered when a Milestone is edited. | `milestone.edited`
`opened` |  This action is triggered when a Milestone is opened. | `milestone.opened`
  
[Additional Information about `milestone`](https://developer.github.com/v3/activity/events/types/#milestoneevent)

## `organization`
This event is triggered when a user is added, removed, or invited to an Organization. *Organization hooks only.*

Action | Description | Syntax
-------|-------------|--------
`member_added` | This action is triggered when a user is addedto an Organization. | `organization.member_added`
`member_invited` |  This action is triggered when a user is invited to an Organization. | `organization.member_invited`
`member_removed` |  This action is triggered when a user is removed from an Organization. | `organization.member_removed`

[Additional Information about `organization`](https://developer.github.com/v3/activity/events/types/#organizationevent)

## `org_block`
This event is triggered when an organization blocks or unblocks a user. *Organization hooks only.*

Action | Description | Syntax
-------|-------------|--------
`blocked` | This action is triggered when an organization blocks a user. | `org_block.blocked`
`unblocked` | This event is triggered when an organization unblocks a user. | `org_block.unblocked`

[Additional Information about `org_block`](https://developer.github.com/v3/activity/events/types/#orgblockevent)

## `page_build`
This event is triggered when a Pages site is built or results in a failed build.

[Additional Information about `page_build`](https://developer.github.com/v3/activity/events/types/#pagebuildevent)

## `ping`
When you create a new webhook, GitHub send you a simple ping event to let you know you've set up the webhook correctly. This event isn't stored so it isn't retrievable via the Events API. You can trigger a ping again by calling the ping endpoint.

[Additional Information about `ping`](https://developer.github.com/webhooks/#ping-event)

## `project_card`
This event is triggered when a Project Card is created, edited, moved, converted to an issue, or deleted.

Action | Description | Syntax
-------|-------------|--------
`closed` | This action is triggered when a Project Card is closed. | `project_card.closed`
`created` | This action is triggered when a Project Card is created. | `project_card.created`
`deleted` | This action is triggered when a Project Card is deleted. | `project_card.deleted`
`edited` | This action is triggered when a Project Card is edited. | `project_card.edited`
`reopened` | This action is triggered when a Project Card is converted to an issue. | `project_card.reopened`

[Additional Information about `project_card`](https://developer.github.com/v3/activity/events/types/#projectcardevent)

## `project_column`
This event is triggered when a Project Column is created, edited, moved, or deleted.

Action | Description | Syntax
-------|-------------|--------
`created` | This action is triggered when a Project Column is created. | `project_column.created`
`deleted` | This action is triggered when a Project Column is deleted. | `project_column.deleted`
`edited` | This action is triggered when a Project Column is edited. | `project_column.edited`
`moved` | This action is triggered when a Project Column is moved. | `project_column.moved`

[Additional Information about `project_column`](https://developer.github.com/v3/activity/events/types/#projectcolumnevent)

## `project`
This event is triggered when a Project is created, edited, closed, reopened, or deleted.

Action | Description | Syntax
-------|-------------|--------
`converted`| This action is triggered when a Project is converted. | `project.converted`
`created` | This action is triggered when a Project is created. | `project.created`
`deleted` | This action is triggered when a Project is deleted. | `project.deleted`
`edited` | This action is triggered when a Project is edited. | `project.edited`
`moved` | This action is triggered when a Project is moved. | `project.moved`

[Additional Information about `project`](https://developer.github.com/v3/activity/events/types/#projectevent)

## `public`
This event is triggered when a Repository changes from private to public.

[Additional Information about `public`](https://developer.github.com/v3/activity/events/types/#publicevent)

## `pull_request_review_comment`
This event is triggered when a comment on a pull request's unified diff is created, edited, or deleted (in the Files Changed tab).

Action | Description | Syntax
-------|-------------|--------
`created` | This action is triggered when a comment on a pull request's unified diff is created. | `pull_request_review_comment.created`
`deleted` | This action is triggered when a comment on a pull request's unified diff is deleted. | `pull_request_review_comment.deleted`
`edited` | This action is triggered when a comment on a pull request's unified diff is edited. | `pull_request_review_comment.edited`

[Additional Information about `pull_request_review_comment`](https://developer.github.com/v3/activity/events/types/#pullrequestreviewcommentevent)

## `pull_request_review`
This event is triggered when a pull request review is submitted, edited, or dismissed.

Action | Description | Syntax
-------|-------------|--------
`dismissed` | This action is triggered when a pull request review is dismissed. | `pull_request_review.dismissed`
`edited` | This action is triggered when a pull request review is edited. | `pull_request_review.edited`
`submitted` | This action is triggered when a pull request review is submitted. | `pull_request_review.submitted`

[Additional Information about `pull_request_review`](https://developer.github.com/v3/activity/events/types/#pullrequestreviewevent)

## `pull_request`
This event is triggered when a pull request is assigned, unassigned, labeled, unlabeled, opened, edited, closed, reopened, or synchronized (updated due to a new push in the branch that the pull request is tracking). Also any time a pull request review is requested, or a review request is removed.

Action | Description | Syntax
-------|-------------|--------
`closed`| This action is triggered when a pull request is closed. |`pull_request.closed`
`edited`| This action is triggered when a pull request is edited.|`pull_request.edited`
`labeled`| This action is triggered when a pull request is labeled. |`pull_request.labeled`
`opened`| This action is triggered when a pull request is opened. |`pull_request.opened`
`reopened`| This action is triggered when a pull request is reopened. |`pull_request.reopened`
`review_request_removed`| This action is triggered when a review request is removed. |`pull_request.review_request_removed`
`review_requested`| This action is triggered when a pull request review is requested. |`pull_request.review_requested`
`synchronize`| This action is triggered when a pull request is synchronized. |`pull_request.synchronize`
`unassigned`| This action is triggered when a pull request is unassigned. |`pull_request.unassigned`
`unlabeled`| This action is triggered when a pull request is unlabeled. |`pull_request.unlabeled`

[Additional Information about `pull_request`](https://developer.github.com/v3/activity/events/types/#pullrequestevent)

## `push`
This event is triggered when it push to a Repository, including editing tags or branches. Commits via API actions that update references are also counted. *This is the default event.*

[Additional Information about `push`](https://developer.github.com/v3/activity/events/types/#pushevent)

## `repository`
This event is triggered when a Repository is created, deleted (organization hooks only), archived, unarchived, made public, or made private.

Action | Description | Syntax
-------|-------------|--------
`archived`| This action is triggered when a Repository is archived. |`repository.archived`
`created`|  This action is triggered when a Repository is created.  |`repository.created`
`deleted`|  This action is triggered when a Repository is deleted.  |`repository.deleted`
`privatized`|  This action is triggered when a Repository is made private.  |`repository.privatized`
`publicized`| This action is triggered when a Repository is made public  |`repository.publicized`
`unarchived`| This action is triggered when a Repository is  unarchived.  |`repository.unarchived`

[Additional Information about `repository`](https://developer.github.com/v3/activity/events/types/#repositoryevent)

## `release`
This event is triggered when a Release is published in a Repository.

Action | Description | Syntax
-------|-------------|--------
`published` | This action is triggered when a Release is published in a Repository. | `release.published`

[Additional Information about `release`](https://developer.github.com/v3/activity/events/types/#releaseevent)

## `status`
This event is triggered when a Repository has a status update from the API.

[Additional Information about `status`](https://developer.github.com/v3/activity/events/types/#statusevent)

## `team`
This event is triggered when a team is created, deleted, modified, or added to or removed from a repository. *Organization hooks only.*

Action | Description | Syntax
-------|-------------|--------
`added_to_repository` | This action is triggered when a team added to a repository. | `team.added_to_repository`
`created` | This action is triggered when a team is created in a repository. | `team.created`
`deleted` | This action is triggered when a team is deleted in from a repository. | `team.deleted`
`edited` |This action is triggered when a team is edited from a repository. | `team.edited`
`removed_from_repository` | This action is triggered when a team is removed from a repository. | `team.removed_from_repository`

[Additional Information about `team`](https://developer.github.com/v3/activity/events/types/#teamevent)

## `team_add`
This event is triggered when a team is added or modified on a Repository.

[Additional Information about `team_add`](https://developer.github.com/v3/activity/events/types/#teamaddevent)

## `watch`
This event is triggered when a User stars a Repository.

Action | Description | Syntax
-------|-------------|--------
`started` | This action is triggered when a User stars a Repository. | `watch.started`

[Additional Information about `watch`](https://developer.github.com/v3/activity/events/types/#watchevent)

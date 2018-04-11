# Events and Actions

There are many events on GitHub which gets subscribed to webhooks. One of these events is triggered, GitHub sends a HTTP POST payload to the webhook's configured URL.

While configuring a webhook, one can choose which events you would like to receive payloads for. Only subscribing to the specific events you plan on handling is useful for limiting the number of HTTP requests to your server. You can even opt-in to all current and future events. You can change the list of subscribed events through the API or UI anytime. 

Also, each event corresponds to a certain set of actions that can happen to your organization and/or repository.

Given below is a list of GitHub webhook events and actions related to the events.
  * [`*`](https://github.com/aps120797/probot/blob/master/docs/events-actions.md#)
  * [`commit_comment`](https://github.com/aps120797/probot/blob/master/docs/events-actions.md#commit_comment)
  * [`create`](https://github.com/aps120797/probot/blob/master/docs/events-actions.md#create)
  * [`delete`](https://github.com/aps120797/probot/blob/master/docs/events-actions.md#delete)
  * [`deployment`](https://github.com/aps120797/probot/blob/master/docs/events-actions.md#deployment)
  * [`deployment_status`](https://github.com/aps120797/probot/blob/master/docs/events-actions.md#deployment_status)
  * [`fork`](https://github.com/aps120797/probot/blob/master/docs/events-actions.md#fork)
  * [`gollum`](https://github.com/aps120797/probot/blob/master/docs/events-actions.md#gollum)
  * [`installation`](https://github.com/aps120797/probot/blob/master/docs/events-actions.md#installation)
  * [`installation_repositories`](https://github.com/aps120797/probot/blob/master/docs/events-actions.md#installation_repositories)
  * [`issue_comment`](https://github.com/aps120797/probot/blob/master/docs/events-actions.md#issue_comment)
  * [`issues`](https://github.com/aps120797/probot/blob/master/docs/events-actions.md#issues)
  * [`label`](https://github.com/aps120797/probot/blob/master/docs/events-actions.md#label)
  * [`marketplace_purchase`](https://github.com/aps120797/probot/blob/master/docs/events-actions.md#marketplace_purchase)
  * [`member`](https://github.com/aps120797/probot/blob/master/docs/events-actions.md#member)
  * [`membership`](https://github.com/aps120797/probot/blob/master/docs/events-actions.md#membership)
  * [`milestone`](https://github.com/aps120797/probot/blob/master/docs/events-actions.md#milestone)
  * [`organization`](https://github.com/aps120797/probot/blob/master/docs/events-actions.md#organization)
  * [`org_block`](https://github.com/aps120797/probot/blob/master/docs/events-actions.md#org_block)
  * [`page_build`](https://github.com/aps120797/probot/blob/master/docs/events-actions.md#page_build)
  * [`ping`](https://github.com/aps120797/probot/blob/master/docs/events-actions.md#ping)
  * [`project_card`](https://github.com/aps120797/probot/blob/master/docs/events-actions.md#project_card)
  * [`project_column`](https://github.com/aps120797/probot/blob/master/docs/events-actions.md#project_column)
  * [`project`](https://github.com/aps120797/probot/blob/master/docs/events-actions.md#project)
  * [`public`](https://github.com/aps120797/probot/blob/master/docs/events-actions.md#public)
  * [`pull_request_review_comment`](https://github.com/aps120797/probot/blob/master/docs/events-actions.md#pull_request_review_comment)
  * [`pull_request_review`](https://github.com/aps120797/probot/blob/master/docs/events-actions.md#pull_request_review)
  * [`pull_request`](https://github.com/aps120797/probot/blob/master/docs/events-actions.md#pull_request)
  * [`push`](https://github.com/aps120797/probot/blob/master/docs/events-actions.md#push)
  * [`repository`](https://github.com/aps120797/probot/blob/master/docs/events-actions.md#repository)
  * [`release`](https://github.com/aps120797/probot/blob/master/docs/events-actions.md#release)
  * [`status`](https://github.com/aps120797/probot/blob/master/docs/events-actions.md#status)
  * [`team`](https://github.com/aps120797/probot/blob/master/docs/events-actions.md#team)
  * [`team_add`](https://github.com/aps120797/probot/blob/master/docs/events-actions.md#team_add)
  * [`watch`](https://github.com/aps120797/probot/blob/master/docs/events-actions.md#watch)

## `*` (Wildcard Event)
It is the [Wildcard Event](https://developer.github.com/webhooks/#wildcard-event). It matches all supported events. When you add the wildcard event, it will replace any existing events you have configured with the wildcard event and send you payloads for all supported events. One will also automatically get any new events that Developers at GitHub might add in the future.

## `commit_comment`
This event is triggered when a commit is commented on.

Action | Description | Syntax
-------|-------------|--------
`created` | This action is triggered when a comment on a comment is created. | `commit_comment.created`

## `create`
This event is triggered when a Branch or Tag is created.

## `delete`
This event is triggered when a Branch or Tag is deleted.

## `deployment`
This event is triggered when a Repository has a new deployment created from the API.


## `deployment_status`
This event is triggered when  a deployment for a Repository has a status update from the API.


## `fork`
This event is triggered when a Repository is forked.

## `gollum`
This event is triggered when a Wiki page is updated.

## `installation`
This event is triggered when a GitHub App is installed or uninstalled.

Action | Description | Syntax
-------|-------------|--------
`created` | The action is triggered when a GitHub app is installed. | `installation.created`
`deleted` | The action is triggered when a GitHub app is uninstalled | `installation.deleted`


## `installation_repositories`
This event is triggered when a repository is added or removed from an installation.

Action | Description | Syntax
-------|-------------|--------
`added` | This action is triggered when a repository is added from an installation. | `installation_repositories.added`
`removed` | This action is triggered when a repository is removed from an installation. | `installation_repositories.removed`

## `issue_comment`
This event is triggered when a repository is added or removed from an installation.

Action | Description | Syntax
-------|-------------|--------
`created` | This action is triggered when a repository is added from an installation. | `issue_comment.created`
`deleted` | This action is triggered when a repository is removed from an installation.  | `issue_comment.deleted`
`edited` | This action is triggered when a repository is edited from an installation. | `issue_comment.edited`

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


## `label`
This event is triggered when a Label is created, edited, or deleted.

Action | Description | Syntax
-------|-------------|--------
`created`| This action is triggered when a Label is created. | `issues.created`
`deleted`| This action is triggered when a Label is deleted. | `issues.deleted`
`edited`| This action is triggered when a Label is edited. | `issues.edited`

## `marketplace_purchase`
This event is triggered when a user purchases, cancels, or changes their [GitHub Marketplace](https://github.com/marketplace/) plan.

Action | Description | Syntax
-------|-------------|--------
`cancelled` | This action is triggered when a user cancels their [GitHub Marketplace](https://github.com/marketplace/) plan. | `marketplace_purchase.cancelled`
`changed` |  This action is triggered when a user changes their [GitHub Marketplace](https://github.com/marketplace/) plan. | `marketplace_purchase.changed`
`purchased` |  This action is triggered when a user purchases their [GitHub Marketplace](https://github.com/marketplace/) plan. | `marketplace_purchase.purchased`

## `member`
This event is triggered when a User is added or removed as a collaborator to a Repository, or has their permissions modified.

Action | Description | Syntax
-------|-------------|--------
`added` | This action is triggered when a User is added  as a collaborator to a Repository. | `member.added` 
`deleted` | This action is triggered when a User is added as a collaborator to a Repository. | `member.deleted` 
`edited` | This action is triggered when a User has their permissions modified. | `member.edited` 


## `membership`
This event is triggered when  a User is added or removed from a team. Organization hooks only.

Action | Description | Syntax
-------|-------------|--------
`added` | This action is triggered when  a User is added from a team. | `membership.added`
`removed` | This action is triggered when  a User is removed from a team.  | `membership.removed`

## `milestone`
This event is triggered when a Milestone is created, closed, opened, edited, or deleted.

Action | Description | Syntax
-------|-------------|--------
`closed` | This action is triggered when a Milestone is closed. | `milestone.closed`
`created` | This action is triggered when a Milestone is created. | `milestone.created`
`deleted` | This action is triggered when a Milestone is deleted. | `milestone.deleted`
`edited` | This action is triggered when a Milestone is edited. | `milestone.edited`
`opened` |  This action is triggered when a Milestone is opened. | `milestone.opened`
  
## `organization`
This event is triggered when a user is added, removed, or invited to an Organization. *Organization hooks only.*

Action | Description | Syntax
-------|-------------|--------
`member_added` | This action is triggered when a user is addedto an Organization. | `organization.member_added`
`member_invited` |  This action is triggered when a user is invited to an Organization. | `organization.member_invited`
`member_removed` |  This action is triggered when a user is removed from an Organization. | `organization.member_removed`


## `org_block`
This event is triggered when an organization blocks or unblocks a user. *Organization hooks only.*

Action | Description | Syntax
-------|-------------|--------
`blocked` | This action is triggered when an organization blocks a user. | `org_block.blocked`
`unblocked` | This event is triggered when an organization unblocks a user. | `org_block.unblocked`

## `page_build`
This event is triggered when a Pages site is built or results in a failed build.

## `ping`
This event is triggered when the app pings the webhook to check its connection.

## `project_card`
This event is triggered when a Project Card is created, edited, moved, converted to an issue, or deleted.

Action | Description | Syntax
-------|-------------|--------
`closed` | This action is triggered when a Project Card is closed. | `project_card.closed`
`created` | This action is triggered when a Project Card is created. | `project_card.created`
`deleted` | This action is triggered when a Project Card is deleted. | `project_card.deleted`
`edited` | This action is triggered when a Project Card is edited. | `project_card.edited`
`reopened` | This action is triggered when a Project Card is converted to an issue. | `project_card.reopened`

## `project_column`
This event is triggered when a Project Column is created, edited, moved, or deleted.

Action | Description | Syntax
-------|-------------|--------
`created` | This action is triggered when a Project Column is created. | `project_column.created`
`deleted` | This action is triggered when a Project Column is deleted. | `project_column.deleted`
`edited` | This action is triggered when a Project Column is edited. | `project_column.edited`
`moved` | This action is triggered when a Project Column is moved. | `project_column.moved`


## `project`
This event is triggered when a Project is created, edited, closed, reopened, or deleted.

Action | Description | Syntax
-------|-------------|--------
`converted`| This action is triggered when a Project is converted. | `project.converted`
`created` | This action is triggered when a Project is created. | `project.created`
`deleted` | This action is triggered when a Project is deleted. | `project.deleted`
`edited` | This action is triggered when a Project is edited. | `project.edited`
`moved` | This action is triggered when a Project is moved. | `project.moved`


## `public`
This event is triggered when a Repository changes from private to public.

## `pull_request_review_comment`
This event is triggered when a comment on a pull request's unified diff is created, edited, or deleted (in the Files Changed tab).

Action | Description | Syntax
-------|-------------|--------
`created` | This action is triggered when a comment on a pull request's unified diff is created. | `pull_request_review_comment.created`
`deleted` | This action is triggered when a comment on a pull request's unified diff is deleted. | `pull_request_review_comment.deleted`
`edited` | This action is triggered when a comment on a pull request's unified diff is edited. | `pull_request_review_comment.edited`

## `pull_request_review`
This event is triggered when a pull request review is submitted, edited, or dismissed.

Action | Description | Syntax
-------|-------------|--------
`dismissed` | This action is triggered when a pull request review is dismissed. | `pull_request_review.dismissed`
`edited` | This action is triggered when a pull request review is edited. | `pull_request_review.edited`
`submitted` | This action is triggered when a pull request review is submitted. | `pull_request_review.submitted`

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

## `push`
This event is triggered when it push to a Repository, including editing tags or branches. Commits via API actions that update references are also counted. *This is the default event.*

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

## `release`
This event is triggered when a Release is published in a Repository.

Action | Description | Syntax
-------|-------------|--------
`published` | This action is triggered when a Release is published in a Repository. | `release.published`

## `status`
This event is triggered when a Repository has a status update from the API.

## `team`
This event is triggered when a team is created, deleted, modified, or added to or removed from a repository. *Organization hooks only.*

Action | Description | Syntax
-------|-------------|--------
`added_to_repository` | This action is triggered when a team added to a repository. | `team.added_to_repository`
`created` | This action is triggered when a team is created in a repository. | `team.created`
`deleted` | This action is triggered when a team is deleted in from a repository. | `team.deleted`
`edited` |This action is triggered when a team is edited from a repository. | `team.edited`
`removed_from_repository` | This action is triggered when a team is removed from a repository. | `team.removed_from_repository`

## `team_add`
This event is triggered when a team is added or modified on a Repository.

## `watch`
This event is triggered when a User stars a Repository.

Action | Description | Syntax
-------|-------------|--------
`started` | This action is triggered when a User stars a Repository. | `watch.started`

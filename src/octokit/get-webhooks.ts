import { Webhooks } from "@octokit/webhooks";

import { State } from "../types";
import { getErrorHandler } from "../helpers/get-error-handler";
import { webhookTransform } from "./octokit-webhooks-transform";

// import { Context } from "../context";

export function getWebhooks(state: State) {
  // TODO: This should be webhooks = new Webhooks<Context>({...}) but fails with
  //       > The context of the event that was triggered, including the payload and
  //         helpers for extracting information can be passed to GitHub API calls
  const webhooks = new Webhooks({
    secret: state.webhooks.secret!,
    transform: webhookTransform.bind(null, state),
  });
  webhooks.onError(getErrorHandler(state.log));
  return webhooks;
}

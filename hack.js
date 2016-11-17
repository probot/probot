// THIS IS A GROSS HACK TO BYPASS THE NEED FOR A WEBHOOKS SETUP
// TO BE REMOVED

const Configuration = require('./lib/configuration');
const Dispatcher = require('./lib/dispatcher');
const GitHubApi = require('github');
const github = new GitHubApi({debug: false});

event = {
  payload: {
    repository: "",
  },

  issue : {
    id: 1,
    title: "Issue without steps",
    body: "how do I use this thing?",
  }
}
const dispatcher = new Dispatcher(github, event);
let config = Configuration.load(github, event.payload.repository)
dispatcher.call(config)

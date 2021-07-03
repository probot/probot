---
next: docs/best-practices.md
title: Persistence
---

# Persistence

Generally speaking, adding database storage or persistence to your Probot App will greatly complicate your life. It's perfectly doable, but for most use-cases you'll be able to manage relevant data within GitHub issues, pull requests and your app's configuration file.

**Contents:**

<!-- toc -->

- [Using GitHub for persistent data](#using-github-for-persistent-data)
- [Using a Database](#using-a-database)
  - [MongoDB (with Mongoose)](#mongodb-with-mongoose)
  - [MySQL](#mysql)
  - [Postgres](#postgres)
  - [Firebase](#firebase)

<!-- tocstop -->

## Using GitHub for persistent data

Probot includes a wrapper for the GitHub API which can enable you to store and manipulate data in the GitHub environment. Since your Probot App will usually be running to supplement work done on GitHub, it makes sense to try to keep everything in one place and avoid extra complications.

- _Comments:_ The API can read, write and delete comments on issues and pull requests.
- _Status:_ The API can read and change the status of an issue or pull request.
- _Search:_ GitHub has a powerful search API that can be used
- _Repository:_ Built-in `context.config()` allows storing configuration in the repository or the organization's `.github` repository.
- _Labels:_ The API can read labels, and add or remove them from issues and pull requests.

If your Probot App needs to store more data than Issues and Pull Requests store normally, you can use the [`probot-metadata` extension](/docs/extensions#metadata) to hide data in comments. It isn't meant to be super secure or scalable, but it's an easy way to manage some data without a full database.

There are even more APIs that you can use to increase the functionality of your Probot App. You can read about all of the ones available in Probot on the [`@octokit/rest` documentation](http://octokit.github.io/rest.js/).

## Using a Database

For when you absolutely do need external data storage, here are some examples using a few popular database solutions. Note that these are just suggestions, and that your implementation will vary.

### MongoDB (with Mongoose)

[MongoDB](https://mongodb.com) is a popular NoSQL database, and [Mongoose](http://mongoosejs.com) is a widely used Node.js wrapper for it.

```js
// PeopleSchema.js

const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const PeopleSchema = new Schema({
  name: {
    type: String,
    required: true,
  },
});

module.exports = mongoose.model("People", PeopleSchema);
```

```js
// index.js

const mongoose = require("mongoose");

// Connect to the Mongo database using credentials
// in your environment variables
const mongoUri = `mongodb://${process.env.DB_HOST}`;

mongoose.connect(mongoUri, {
  user: process.env.DB_USER,
  pass: process.env.DB_PASS,
  useMongoClient: true,
});

// Register the mongoose model
const People = require("./PeopleSchema");

module.exports = (app) => {
  app.on("issues.opened", async (context) => {
    // Find all the people in the database
    const people = await People.find().exec();

    // Generate a string using all the peoples' names.
    // It would look like: 'Jason, Jane, James, Jennifer'
    const peoplesNames = people.map((person) => person.name).join(", ");

    // `context` extracts information from the event, which can be passed to
    // GitHub API calls. This will return:
    //   { owner: 'yourname', repo: 'yourrepo', number: 123, body: 'The following people are in the database: Jason, Jane, James, Jennifer' }
    const params = context.issue({
      body: `The following people are in the database: ${peoplesNames}`,
    });

    // Post a comment on the issue
    return context.octokit.issues.createComment(params);
  });
};
```

### MySQL

Using the [`@databases/mysql`](https://www.atdatabases.org/docs/mysql.html) module, we can connect to our MySQL database and perform queries.

```js
// connection.js
const mysql = require("@databases/mysql");

// DATABASE_URL = mysql://my-user:my-password@localhost/my-db
const connection = connect(process.env.DATABASE_URL);

module.exports = connection;
```

```js
// index.js
const { sql } = require("@databases/mysql");
const connection = require("./connection");

module.exports = (app) => {
  app.on("issues.opened", async (context) => {
    // Find all the people in the database
    const people = await connection.query(sql`SELECT * FROM people`);

    // Generate a string using all the peoples' names.
    // It would look like: 'Jason, Jane, James, Jennifer'
    const peoplesNames = people.map((key) => people[key].name).join(", ");

    // `context` extracts information from the event, which can be passed to
    // GitHub API calls. This will return:
    //   { owner: 'yourname', repo: 'yourrepo', number: 123, body: 'The following people are in the database: Jason, Jane, James, Jennifer' }
    const params = context.issue({
      body: `The following people are in the database: ${peoplesNames}`,
    });

    // Post a comment on the issue
    return context.octokit.issues.createComment(params);
  });
};
```

### Postgres

Using the [`@databases/pg`](https://www.atdatabases.org/docs/pg.html) module, we can connect to our Postgres database and perform queries.

```js
// connection.js
const mysql = require("@databases/pg");

// DATABASE_URL = postgresql://my-user:my-password@localhost/my-db
const connection = connect(process.env.DATABASE_URL);

module.exports = connection;
```

```js
// index.js
const { sql } = require("@databases/pg");
const connection = require("./connection");

module.exports = (app) => {
  app.on("issues.opened", async (context) => {
    // Find all the people in the database
    const people = await connection.query(sql`SELECT * FROM people`);

    // Generate a string using all the peoples' names.
    // It would look like: 'Jason, Jane, James, Jennifer'
    const peoplesNames = people.map((key) => people[key].name).join(", ");

    // `context` extracts information from the event, which can be passed to
    // GitHub API calls. This will return:
    //   { owner: 'yourname', repo: 'yourrepo', number: 123, body: 'The following people are in the database: Jason, Jane, James, Jennifer' }
    const params = context.issue({
      body: `The following people are in the database: ${peoplesNames}`,
    });

    // Post a comment on the issue
    return context.octokit.issues.createComment(params);
  });
};
```

### Firebase

[Firebase](https://firebase.google.com/) is Google's services-as-a-service that includes a simple JSON database. You can learn more about dealing with the JavaScript API [here](https://firebase.google.com/docs/database/web/start). Note that for security purposes, you may also want to look into the [Admin API](https://firebase.google.com/docs/database/admin/start).

```js
// index.js

const firebase = require("firebase");
// Set the configuration for your app
// TODO: Replace with your project's config object
const config = {
  apiKey: "apiKey",
  authDomain: "projectId.firebaseapp.com",
  databaseURL: "https://databaseName.firebaseio.com",
};
firebase.initializeApp(config);

const database = firebase.database();

module.exports = (app) => {
  app.on("issues.opened", async (context) => {
    // Find all the people in the database
    const people = await database
      .ref("/people")
      .once("value")
      .then((snapshot) => {
        return snapshot.val();
      });

    // Generate a string using all the peoples' names.
    // It would look like: 'Jason, Jane, James, Jennifer'
    const peoplesNames = Object.keys(people)
      .map((key) => people[key].name)
      .join(", ");

    // `context` extracts information from the event, which can be passed to
    // GitHub API calls. This will return:
    //   { owner: 'yourname', repo: 'yourrepo', number: 123, body: 'The following people are in the database: Jason, Jane, James, Jennifer' }
    const params = context.issue({
      body: `The following people are in the database: ${peoplesNames}`,
    });

    // Post a comment on the issue
    return context.octokit.issues.createComment(params);
  });
};
```

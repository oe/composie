<h1 align="center">Composie</h1>

<h5 align="center">compose middleware with router and run it like a charm </h5>
<div align="center">
  <a href="https://github.com/oe/composie/actions/workflows/pages.yml">
    <img src="https://github.com/oe/composie/actions/workflows/pages.yml/badge.svg" alt="Github Workflow">
  </a>
  <a href="#readme">
    <img src="https://badges.frapsoft.com/typescript/code/typescript.svg?v=101" alt="code with typescript" height="20">
  </a>
  <a href="#readme">
    <img src="https://badge.fury.io/js/composie.svg" alt="npm version" height="20">
  </a>
  <a href="https://www.npmjs.com/package/composie">
    <img src="https://img.shields.io/npm/dm/composie.svg" alt="npm version" height="20">
  </a>
</div>

<br>

This is a koa & koa-routers like library that enable you compose middleware and run it easily.

This library has no dependence, you can run it both in nodejs and browser.

## Install

```sh
npm install composie
```

or

```sh
yarn add composie
```

## Example

```js
const Composie = require("composie");
const composie = new Composie();
composie
  // add a global middleware to log
  .use(function(ctx, next) {
    console.log("request from channel", ctx.channel);
    return next();
  })
  // add a global middleware to validate request data
  .use(function(ctx, next) {
    if (!ctx.request) throw new Error("bad request");
    return next();
  })
  // add middleware for channel with prefix 'api/'
  .use("api/", function(ctx, next) {
    ctx.from = +new Date();
    return next();
  })
  // add a router for channel 'api/user-info'
  .route("api/user-info", function(ctx, next) {
    ctx.response = "I am from first route for api/user-info";
  })
  // add multi router
  .route({
    // add another router for "api/user-info"
    "api/user-info": function(ctx, next) {
      ctx.response += ", hello from second, request at " + ctx.from;
    },
    "view/home": function(ctx, next) {
      ctx.response = "This is home page";
    }
  });

// get response with promise
composie.run("api/user-info").then(
  function(resp) {
    console.log(resp);
  },
  function(err) {
    console.log(err);
    // => bad request
  }
);

composie.run("api/user-info", { id: "xxxxxx" }).then(
  function(resp) {
    console.log(resp);
    // => I am from first route for api/user-info, hello from second, request at 1538209634315
  },
  function(err) {
    console.log(err);
  }
);
```

## Usage

### middleware

Before use it, you should know that, every middleware is a function that recieve two parameters `ctx` and `next`:

```js
function (ctx, next) {
  // your logic here
}
```

`ctx` is an object contains request info:

```js
{
  channel: 'channel name',
  request: 'any request data'
}
```

1. You should save your result in `ctx.response`, you will get it in `.run` promise resolve
2. and you can add your own property to `ctx` to share information between middlewares
3. **use `return next()` or `await next()`(in async function) if you want `ctx` be processed by the next middleware, or just `return` to terminate it**
4. use `throw` to throw an error if an error occurred, you will catch it in `.run` promise reject

### Composie()

Create an instance

```js
const Composie = require("composie");
// no arguments is needed
const composie = new Composie();
```

This libaray is writen in `class`, you should create an instance with `new` before use it

### composie.use(middleware)

Add global middleware, all invoking will proccessed by global middleware

```js
composie.use(function(ctx, next) {
  // your logic here
});
```

You can add more than more than one global `middleware`, they will run by the order you adding.

### composie.use(channelPrefix, middleware)

Add a middleware for channel has specific prefix, when run the middleware, if the channel match the prefix, then will be processed by the that middleware.

```js
composie.use("api", function(ctx, next) {
  // your logic here
});
```

You can also add as many middlewares as you want for one prefix.

### composie.route(channel, middleware, [middleware...])

Add middlewares for a specific channel, you can add more than one at a time.

```js
compose.route(
  "api/user",
  function(ctx, next) {
    // your logic here
  },
  function(ctx, next) {
    // another middleware
  }
);
```

### composie.route({channel: [middleware...]})

Add middlewares for more than one channel

```js
compose.route({
  "api/user": function(ctx, next) {
    // your logic here
  },
  "api/detail": [
    function(ctx, next) {
      // your logic here
    },
    function(ctx, next) {
      // another middleware
    }
  ]
});
```

### composie.run(channel, request?)

run middleware for `channel`, it will return a promise

```js
compose.run("api/user", { id: "xxx" }).then(
  resp => {
    console.log("response ", resp);
  },
  err => {
    console.log("error", err);
  }
);
```

### composie.run(context)

run middleware with custom `context`, a valid context must contain a string `channel` and an optional `request`.

```js
compose
  .run({
    channel: "api/user",
    request: { id: "xxx" }
  })
  .then(
    resp => {
      console.log("response ", resp);
    },
    err => {
      console.log("error", err);
    }
  );
```

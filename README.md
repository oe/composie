<h1 align="center">Composie</h1>

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
Composie is a library similar to Koa and Koa-Router that allows you to compose middleware and run them with ease. In addition to being a middleware and routing solution, Composie can also serve as an advanced event bus with `on`, `off`, and `emit` methods.

## Features

- **Middleware Composition**: Supports chaining and complex middleware compositions.
- **Routing**: Based on path routing for middleware.
- **Event Bus**: Easily handle and trigger events using `on`, `off`, and `emit`.


## Installation
Install via npm:

```sh
npm install composie
```

Or via yarn:

```sh
yarn add composie
```

## Usage

### Basic Usage
```js
import Composie from 'composie'; // or const Composie = require('composie');
const composie = new Composie();
// Add global middleware
composie.use((ctx, next) => {
  console.log('Global middleware');
  return next();
});

// Add route middleware
composie.route('api/user-info', (ctx, next) => {
  ctx.response = 'User info';
  return next();
});

// Run middleware
composie.run('api/user-info').then(response => {
  console.log(response); // 'User info'
});

// remove route
composie.remove('api/user-info');
```

### Using as an Event Bus
```js
const Composie = require('composie');
const composie = new Composie();

// add general middleware for all events
composie.use(async (ctx, next) => {
  // simulate async operation
  await Promise(resolve => setTimeout(resolve, 1000));
  console.log(`Handling event: ${ctx.channel}`);
  return next();
});

// Listen for events
composie.on('user-registered', (ctx, next) => {
  console.log(`Handling event for user: ${ctx.request.user}`);
  // to continue to the next callback
  return next();
});
// chain another callback
composie.on('user-registered', (ctx, next) => {
  if (ctx.request.user === 'Alice') {
    ctx.response = 'Alice is registered';
  } else {
    // to continue to the next callback
    return next()
  }
});
// even chain more callbacks
composie.on('user-registered', (ctx, next) => {
  ctx.response = `User ${ctx.request.user} is not registered`;
});

// Emit events
composie.emit('user-registered', { user: 'Alice' }).then((response) => {
  console.log(response); // 'Alice is registered'
});

composie.emit('user-registered', { user: 'Bob' }).then((response) => {
  console.log(response); // 'User Bob is not registered'
});

// Remove event listener
composie.off('user-registered');
```

## API Documentation

Before you get started, there are some basic concepts of this library.

1. Every middleware(callback) is a function that receive two parameters `ctx` and `next`:

```js
function (ctx, next) {
  // your logic here
}
```

2. `ctx` is an object contains request info:

```js
{
  // channel name, required
  channel: 'channel name',
  // data you passed by run or emit, optional
  request: 'any request data'
  // response data, you should save your result in it
  response: 'any response data'
  // you can add your own property to ctx to share information between middlewares
  ...
}
```

   1. You should save your result in `ctx.response`, you will get it in `.run`(or `.emit`) promise resolve
   2. and you can add your own property to `ctx` to share information between middlewares
   3. **use `return next()` or `await next()`(in async function) if you want `ctx` be processed by the next middleware, or just `return` to terminate it**
   4. use `throw` to throw an error if an error occurred, you will catch it in `.run`(or `.emit`) promise reject

### Composie

Create an instance

```js
import Composie from 'composie'
// no arguments is needed
const composie = new Composie()

```

This libaray is writen in `class`, you should create an instance with `new` before use it

### composie.use(middleware)

Add global middleware, all invoking will proccessed by global middleware

```js
// basic usage
composie.use(function(ctx, next) {
  // your logic here
  return next();
});

// advanced usage
composie.use(async function(ctx, next) {
  try {
    // your logic here
    await next();
  } catch (err) {
    // handle error, you can throw it again or just log it
    console.error(err);
    // set a default response, if you want
    ctx.response = '404 Not Found';
    // or just throw it again, then you can catch it in `.run`(or `.emit`) promise reject
    // throw err;
  }
})
// chain more than one middleware
.use(function(ctx, next) {
  // your logic here
  return next();
});
```

You can add more than more than one global `middleware`, they will run by the order you adding.

### composie.use(channelPrefix, middleware)

Add a middleware for channel has specific prefix, when run the middleware, if the channel match the prefix, then will be processed by the that middleware.

```js
composie.use('api', function(ctx, next) {
  // your logic here
  return next()
});
```
You can also add as many middlewares as you want for one prefix, they will be called in the order they added.

### composie.route(channel, middleware, [middleware...])

Add middlewares for a specific channel, you can add more than one at a time.

`composie.on` is an alias of `composie.route`, use it as you like.

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

`composie.on` is an alias of `composie.route`, use it as you like.

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

### chain `use`, `route` together

You can chain `use` and `route` together

```js
compose
  .use(function(ctx, next) {
    // your logic here
    // ...
    return next();
  })
  .use('api', function(ctx, next) {
    // your logic here
    // ...
    return next();
  })
  .route('api/user', function(ctx, next) {
    // your logic here
  })
  // `on` is an alias of `route`
  .on('api/detail', function(ctx, next) {
    // your logic here
  });

```

### composie.alias(existingChannel, aliasName)
add an alias for an existing channel, when you run the alias, it will be processed by the middleware of the existing channel.

```js
composie.route('api/user', function(ctx, next) {
  ctx.response = 'User info';
});
composie.alias('api/user', 'user');

composie.run('user').then(response => {
  console.log(response); // 'User info'
});
```



### composie.removeRoute(channel, middleware?)
Remove a middleware for a specific channel, if `middleware` is not provided, then all middlewares for that channel will be removed.

`composie.off` is an alias of `composie.removeRoute`, use it as you like.

```js
composie.removeRoute('api/user');

compose.off('api/user', middleware);
```

### composie.run(channel, request?)

run middleware for `channel`, it will return a promise

`composie.emit` is an alias of `composie.run`, use it as you like.

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

`composie.emit` is an alias of `composie.run`, use it as you like.

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


## Advanced Example

Following example shows how to use Composie as an advanced fetch module for a real world application.

```js

import Composie, { ComposieError } from 'composie';
const grab = new Composie({
  createContext: (channel, request) => ({
    // lower case the channel name
    channel: channel.toLowerCase(),
    request,
  },
  throwWhenNoRoute: true
));

grab.use(async (ctx, next) => {
  try {
    // append query string to the url
    if (ctx.request.qs) {
      const qs = new URLSearchParams(ctx.request.qs);
      const url = new URL(ctx.request.url);
      // append query string to the url, concat with the existing query string
      url.search = new URLSearchParams([...url.searchParams, ...qs]);
      ctx.request.url = url.toString();
    }

    await next();
  } catch (err) {
    if (err instanceof ComposieError) {
      if (err.code === ComposieError.CODES.ROUTE_NOT_FOUND) {
        console.error('Route not found');
      } else if (err.code === '') {
        console.error('Method not allowed');
      }
      console.error(err.message);
    } else {
      if (err.code === '401') {
        location.path = '/login';
      }
    }
  }
});
grab.use('post/', (ctx, next) => {
  ctx.request.method = ctx.request.method || 'POST';
  return next();
});

grab.on('post/json', (ctx, next) => {
  if (ctx.request.data) {
   ctx.request.headers = {
     ...ctx.request.headers,
     'Content-Type': 'application/json'
   };
   ctx.request.body = JSON.stringify(ctx.request.data);
  }
  ctx.response = await fetch(ctx.request).then(res => res.json());
});

grab.on('post/form', async (ctx, next) => {
  if (ctx.request.data) {
    ctx.request.headers = {
      ...ctx.request.headers,
      'Content-Type': 'application/x-www-form-urlencoded'
    };
    ctx.request.body = new URLSearchParams(ctx.request.data);
  }
  ctx.response = await fetch(ctx.request).then(res => res.json());
})


grab.use('get/', (ctx, next) => {
  ctx.request.method = ctx.request.method || 'GET';
  return next();
});


grab.on('post/json', async (ctx, next) => {
  ctx.response = await fetch(ctx.request).then(res => res.json());
  return next();
});


grab.emit('post/json', {
  url: 'https://jsonplaceholder.typicode.com/users/1'
}).then((response) => {
  console.log(response);
});

```


## Contribution Guide
We welcome contributions! Please read the following guide to understand how to contribute to the project.

## Submitting Issues
If you find a bug or have a feature request, please submit an issue detailing the problem or suggestion.

## Submitting Pull Requests
1. Fork the repository
2. Create a new branch (git checkout -b feature-branch)
3. Commit your changes (`git commit -am '

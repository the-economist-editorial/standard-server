# Standard Server

This package serves as a meta package for creating Economist Servers for microsites/microservices.

Currently, the package is based on [Connect][], as it is the simplest way to stitch together disparate functionality, and a connect server can be consumed by many other servers: `require('http')`, another connect server, an express server, and so on.

## Goals

- [x] A simple, standardised interface to create useful servers.
- [x] An easily-configurable toolset with which to express more complex servers.
- [x] Solve the common problems without too much knowledge of the intricacies
  - [x] Meaning well vetted dependencies
  - [x] And sensible defaults
- [x] To be able to setup up within a handful of lines of code
- [x] All configuration must be valid JSON

## standardServer()

The main export will return a standard [Connect][] server, with a set of common middleware, depending on the config fed to it. The function takes two optional arguments: the directory name of the current codebase (defaults to `process.cwd()`),  and a configuration object (defaults to reading the `package.json#config.server` directive).

```js
import standardServer from '@economist/standard-server';
export const server = standardServer({ ...config }, __dirname);

server.use(...);

if (require.main === module) {
  server.start();
}
```

This can also be used with Connect or Express as a standard piece of middleware:

```js
import connect from 'connect';
import standardServer from '@economist/standard-server';
export const server = connect()
  .use(standardServer(__dirname, { ...config }))
  .use(...);

if (require.main === module) {
  server.start();
}
```

## Individual Middlewares

If you'd like to use some of these middlewares, but not all of them - you can do so by requiring in the respectively named middleware:

```js
import authenticationMiddleware from '@economist/standard-server/authentication';
import compressionMiddleware from '@economist/standard-server/compression';
import faviconMiddleware from '@economist/standard-server/favicon';
import statsMiddleware from '@economist/standard-server/stats';
import manifestMiddleware from '@economist/standard-server/manifest';
import staticAssetsMiddleware from '@economist/standard-server/static-assets';
```

All middlewares have the same signature. They take a configuration object (see "All Config Options" below for each ones configuration rules), and a directory - which defaults to `process.cwd()`:

```js
import staticAssetsMiddleware from '@economist/standard-server/static-assets';
import connect from 'connect';
connect.use(staticAssetsMiddleware({ directory: 'assets' }, __dirname));
```

Of course, a lot of the middleware are just thing wrappers around the real middlewares - and so if you want ultimate flexibility you could just include those:

 - `authentication` is just [`basic-auth`](https://github.com/jshttp/basic-auth) with some code to wrap it in a connect middleware
 - `compression` is just [`compression`](https://github.com/expressjs/compression) but defaults the `level` to 9 (maximum compression).
 - `favicon` is just [`serve-favicon`](https://github.com/expressjs/serve-favicon) but simplified to use the same signature as the other middlewares.
 - `stats` is a custom middleware - but it just sets some headers and ends the response with `JSON.stringify`. Seriously, its like, 2 logical lines of code.
 - `manifest` is just [`connect-cache-manifest`](https://github.com/dai-shi/connect-cache-manifest). It does a lot of data marshalling, especially to make the config json friendly. It also sets cache headers, because the middleware itself does not set them and some CDNs decide to cache-by-default which is a nightmare for html manifests.
 - `staticAssets` is a combination of [`st`](https://github.com/isaacs/st) with simplified options, and [`accept-webp`](https://github.com/JoshuaWise/accept-webp) for rewriting images to their `.webp` equivalents (if they exist).

## Utilities

Additional utilities have been added to the server. These serve simply to make it
easier to do common things within the server.

### Start Server function

By default, connect servers come with a `.listen()` function, which is fine. `standardServer()` also adds a `.start()` function, which automatically logs the address to visit when the server boots up. It is a small thing, but shortens the amount of code you write.

### Logging Utilities

To help with general logging in your application `server.log` exists - and is a [Bunyan][] logger. This allows for complex log messages which can also be consumed by various streams. For more on Bunyan, [read the docs][Bunyan]. By default the logger is configured to output to stdout, but can be configured with the `logger` property on the config.

The package used is [bunyan-request-logger](https://github.com/ericelliott/bunyan-request-logger) which also adds some extra logging utilities that can be used:

#### metricsInterval

By default, the server will log memory usage and uptime every 30 seconds. The interval is configurable via `server.config.logger.metricsInterval`, which is the number of seconds to wait in between logs (which defaults to 30).

If you want to stop the metrics logging altogether, you can call `server.log.metricsInterval.stop()`. Metrics logging should stop. If you want to start it again, simply call `server.log.metricsInterval()` - you can also pass in the number of seconds you'd like to wait between logs. So, in summary:

```js
// This is automatically called for you when you create the server:
server.log.metricsInterval(server.config.logger.metricsInterval);

// To stop it
server.log.metricsInterval.stop();

// To start it again
server.log.metricsInterval();
// To change the interval
server.log.metricsInterval(60);
server.log.metricsInterval(10);
```

#### request.log

Inside of a request handler, `request.log` has been added. This is similar to `server.log` but it automatically adds the `request` object to the log info, meaning you don't have to:

```js
const server = standardServer();
server.use(function (request, response, next) {
  request.log.info('hello world!');
  // ^ this is the same as this:
  server.log.info(request, 'hello world!');
});
```

#### Logging Utility Middlewares

The `server.log` function also includes some optional middlewares related to logging. These optional middlewares can be used throughout your app - although are not driven from the config because they will likely be used after you have loaded in all of your custom middleware.

##### tracking logger

`server.log.route()` is an additional function which returns a 1x1 tracking pixel for an easy way to gather analytics without JavaScript (for example in an HTML email shot?). It is not included within the config as you is likely more convenient mounted in a place decided by you (maybe in the middle of or at the end of your other middleware).

```js
const server = standardServer();
server.use('tracking.gif', server.log.route())

// In your html...
<img src="/tracking.gif"/>
```

##### errorLogger

`server.log.errorLogger()` is an additional function which provides error logging middleware for you to mount on your server. It is not mounted by default - as you probably want it near the very end of your middleware list - after including all of your custom middleware. It is a passthrough middleware; it does not end the request - it passes the error back through `next()` so you can handle the error in other ways.

```js
const server = standardServer();
server
  .use(...otherMiddlewares)
  .use(...moreMiddlewares)
  .use(...okAllMyMiddlewares)
  // Catch and log all errors.
  .use(server.log.errorLogger())
  // Throw up an error page:
  .use((error, request, response, next) => {
      ...
  });
```

### Config Utilities

The config passed in (or generated) from the standard server is attached to `server.config`. If you supplied a config to the `standardServer()` function, it will be that config, but frozen with `Object.freeze`. If you didn't supply a config to `standardServer()`, then it generates one for you from environment variables (using `npcp`, see below) and attaches it (frozen) to `server.config`.

```js
const config = { foo: 'bar' };
const server = standardServer(__dirname, config);
assert.deepEqual(server.config === config);
assert(server.config.foo === 'bar');

const server = standardServer(/* no config */);
const config = require('./package.json').config.server;
assert.deepEqual(server.config, config);
```

#### Default Config with npcp

If you do not pass in the configuration object through to the `standardServer` function, then it will default to using [`npcp`](https://github.com/erickrdch/npcp). NPCP loads config from npm environment variables - specifically, the ones prefixed `npm_package_config_`. These can be created through the package.json and can also be overridden on an env per env basis. To demonstrate:

###### package.json
```json
{
  "name": "myserver",
  "config": {
    "server": {
      "port": 80
    }
  },
  "scripts": {
    "start": "node .",
    "start-dev": "npm_package_config_server_port=8080 node .",
  }
}
```

In the above example, running `npm start` will have `npm_package_config_server_port` set to `80` - which `npcp` will parse and recreate the config as it looks in the package.json. However, the `start-dev` script overrides this var, and as such `config.server.port` (as parsed by `npcp`) will actually be set to `8080`.

### All Config Options

Here is the config object with all options described:

```js
{
  // The port to listen on, defaults to `8080`. Set to `0` to define a random port.
  // If you use `server.start()` then the randomly chosen port will be logged out
  // when the server has started.
  // npcp override: npm_package_config_server_port
  port: 8080,

  // Having the `authentication` object in your config will switch on HTTP-Basic
  // authentication. This is useful when we deploy servers to production boxes
  // before they are officially published - so the public cannot access them early.
  authentication: {
    // Realm is largely a pointless thing to configure - but you can if you want.
    // npcp override: npm_package_config_authentication_realm
    realm: 'protected',
    // Users are needed for authentication - so you can authenticate! The user object
    // is an emumeration of the key (username) and value (password). Having one
    // single user in the config is enough for the app to use the authentication
    // middleware. This means even setting an env of a single user will enable it.
    // npcp override: npm_package_config_server_authentication_joeblogs = 'password'
    users: {
      "everyone@economist.com": "supersecretpassword"
    },
  },

  // If the `compression` config object is present, then the server will support
  // and send responses GZIPed and Deflated (based on accept-encoding).
  compression: {
    // This object accepts all of the configuration params of the `compression`
    // middleware, see more here: https://github.com/expressjs/compression.
    // Here are the defaults:
    // npcp override: npm_package_config_server_compression_chunkSize
    chunkSize: 16384,
    // npcp override: npm_package_config_server_compression_memLevel
    memLevel: 8,
    // npcp override: npm_package_config_server_compression_level
    level: 9,
  },

  // Adding the `favicon` string will enable the sending of a favicon.ico, which is
  // cached in memory, has a far future expires header, and requests to it do not
  // get logged. The path is concatenated with the `dirname` argument.
  // npcp override: npm_package_config_server_favicon
  favicon: 'assets/favicon.ico',

  // Having a `stats` object will provide the `_stats` url for build metrics.
  // Anything inside the `stats` object is just sent as JSON under the _stats url
  // Also please remember: anything you put inside this object or expose through the
  // `npm_config_server_stats_*` env vars WILL BE VISIBLE TO THE PUBLIC. So don't put
  // secrets, passwords, version numbers, or other such sensitive information in
  // this. Commit IDs, build numbers, dates and times are not considered sensitive
  // enough to pose a security risk.
  stats: {
    // npcp override: npm_package_config_server_stats_buildNumber
    buildNumber: '123',
    // npcp override: npm_package_config_server_stats_commit
    commit: 'abc'
  },

  // The `server.log` and `request.log` functions are automatically created when
  // using standardServer(), but you might want to customise them! This object
  // allows the customisation of the logger.
  logger: {
    // The `name` property will give the Bunyan logger a name, if this is omitted it
    // defaults to "economist-server".
    // npcp override: npm_package_config_server_logger_name
    name: 'myserver',
    // The amount of seconds to wait in between logging memory usage and uptime.
    // Defaults to `30`.
    // npcp override: npm_package_config_server_logger_metricsInterval
    metricsInterval: 30,
    // The level that the server should be logging at. Defaults to `info` but could
    // be one of `fatal`, `error`, `warn`, `info`, `debug`, or `trace`.
    // npcp override: npm_package_config_server_logger_level
    level: 'info',
    // An array of streams to log to. By default, it only logs to `process.stdout`,
    // but this could be overridden to log to other places, such as file:
    streams: [
      // Here we have overridden the logger to only log to /var/log/foo.log.
      // npcp override: npm_package_config_server_logger_streams_0_path
      { path: '/var/log/foo.log' }
    ]
  },

  // Adding `manifest` enables serving of an HTML5 manifest. This allows files to
  // be aggressively cached by browsers, enabling offline support in lieau of
  // Service Workers.
  manifest: {
    // Specifying the URI of the application manifest is important, as this is where
    // the manifest will be served (relative to the root of the server).
    // Default is `'application.manifest'`.
    // npcp override: npm_package_config_server_manifest_uri
    uri: 'application.manifest',
    // Set the number of seconds the manifest should be cached for. This should be
    // a very low number (as you don't want it to be cached for very long), but
    // should be high enough to offload requests onto CDNs when needed.
    // Defaults to 60
    // npcp override: npm_package_config_server_manifest_maxAge
    maxAge: 60,
    // Networks is an Array of strings that are allowed manifest networks.
    // See http://mzl.la/1NS8Omz for more. Defaults to `[ '*' ]`
    // npcp override: npm_package_config_server_manifest_networks_0
    networks: [ '*' ],
    // `directories` is where the real work in manifest config happens. It should be
    // an array of directories you want to add to the manifest. Each value can be a
    // string (if both the directory and server URI are the same, and you want to
    // add all files in that directory to the manifest), or an object with
    // additional properties:
    directories: [
      // This string enumerates all `${dirname}/static` files as `/static/${file}`
      // within the manifest.
      // npcp override: npm_package_config_server_manifest_directorties_0
      'static',
      // Alternatively, pass an object for more control:
      {
        // Directory is the path on the hard drive (it is automatically prefixed
        // with the `dirname`).
        // npcp override: npm_package_config_server_manifest_directorties_1_directory
        directory: 'public',
        // URI is the URL folder that these files exist in.
        // npcp override: npm_package_config_server_manifest_directorties_1_uri
        uri: 'assets',
        // `ignore` is a RegExp string that matches against a file - if the test is
        // `true` that file **wont** be added to the manifest.
        // npcp override: npm_package_config_server_manifest_directorties_1_ignore
        ignore: '.*\\.(gif|jpg)$',
        // `only` can be used as the inverse of `ignore`: in other words, any file
        // in the given directory that returns `true` for this RegExp will be added,
        // while any others will be ignored. This will override the `ignore` prop.
        // npcp override: npm_package_config_server_manifest_directorties_1_only
        only: '.*\\.(js|css|svg)$',
      }
    ]
  },

  // The `static` config option enables serving of static assets with far future
  // expires headers, and heavy optimisations for loading/caching.
  staticAssets: {
    // If you pass `acceptWebp: true` then for every image request that includes an
    // `accept: image/webp`, a webp alternative will attempt to be served, for
    // example if you have `foo.jpg`, and the browser makes a request with the
    // right accept header, _and_ `foo.webp` exists, then `foo.webp` will be served.
    // If `foo.webp` does not exist, `foo.jpg` will be served. You probably want this
    // on if you have any webps, but otherwise disable it to speed up serving of
    // assets.
    // npcp override: npm_package_config_server_staticAssets_acceptWebp
    acceptWebp: true,

    // The URI static assets will be served on. Defaults to `'assets'`
    // npcp override: npm_package_config_server_staticAssets_uri
    uri: 'assets',
    // The directory all static assets are inside, defaults to 'assets'. This is
    // always prefixed with `dirname`.
    // npcp override: npm_package_config_server_staticAssets_directory
    directory: 'assets',
    // The maximum age (in seconds) that a file should be cached for, both internally
    // in Node's memory, and on any CDNs or browsers. Defaults to ONE YEAR.
    // npcp override: npm_package_config_server_staticAssets_maxAge
    maxAge: 3.154e+7,
  },

}
```

[Connect]: https://github.com/senchalabs/connect#readme
[Bunyan]: https://github.com/trentm/node-bunyan#readme

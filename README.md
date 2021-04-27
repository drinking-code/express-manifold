# Express.js Manifold

_An express switch to host multiple express apps on one server._

- [Installation](#installation)
- [Usage](#usage)
    - [`manifold(domains)`](#manifolddomains)
    - [`switcher.listen([httpPort[, httpsPort[, host[, backlog]]]][, callback])`](#switcherlistenhttpport-httpsport-host-backlog-callback)
- [Examples](#examples)
    - [Simple setup](#simple-setup)
    - [The `switcher` object](#the-switcher-object)
    - [HTTP over TLS (HTTPS)](#http-over-tls-https)

## Installation

```shell
npm i express-manifold
```

## Usage

Multiple domains may point to one IP address. With a normal express.js server you would then have to serve the same
web-app / website to all domains pointing to that server. With `express-manifold` however, you can route different
web-apps / websites over the same IP address to different domains.

![figure showing how express-manifold works](figure.svg)

### `manifold(domains)`

`manifold(domains)` where `domains` is a JavaScript object with the domains of the server as the
keys, and either an express app, or a configuration object as the value.  
If given an express app, this app will only listen on the first port given (
see [switcher.listen](#switcherlistenhttpport-httpsport-host-backlog-callback)).  
If given a configuration object, it must follow the following structure.

| Field | Type | Description | Required | Default |
|---|---|---|---|---|
| `server` | express app | The app for the given domain | yes | - |
| `httpsServer` | express app | Another app, if you want to have a different app for https. If not given, the `server` value will be used. | no | - |
| `cert` | string\|buffer | The certificate in PEM format for the given domain. | only if `forceHttps`is `true` | - |
| `key` | string\|buffer | The private keys in PEM format for the given domain. | only if `forceHttps`is `true` | - |
| `selfSigned` | boolean | Whether the certificate given is self-signed or not. Should be `false` or omitted during production. | no | `false` |
| `preferHttps` | boolean | Will redirect http to https if `Upgrade-Insecure-Requests` is set to "1", and certificate and private keys are provided. | no | `true` |
| `forceHttps` | boolean | Will always redirect http to https, regardless of the `preferHttps` mechanism. | no | `false` |

The server given for `server` will listen on both the first, and the second port, except if `httpsServer` is given.
Then, the server given for `server` will listen on the first port and server given for `httpsServer` will listen on the
second port.

This function returns an express server `switcher` which acts like an appended server. That means if you `.get()` a path
that a server on a given domain does not handle, it will fallback to that function. (see [examples](#examples) for
examples)

### `switcher.listen([httpPort[, httpsPort[, host[, backlog]]]][, callback])`

The returned `switcher`'s functions behave the same as in a normal express app, except for the `.listen()` function.
Instead of using one port it will use two.

- The first port is meant to be the HTTP-port, and is used for all given servers for `server`. In production this should
  be `80`.
- The second port is meant to be the HTTPS-port, and is used for all given servers for `httpsServer`. In production this
  should be `443`.
  
If one of both are omitted / undefined, an arbitrary, unused port will be assigned.  

Similar to `express().listen`, this function returns the created http/s server as an array where the first value is the
http server, and the second value is the https server.

## Examples

You can see a simple example in `example/twofold.js`. To run it you have to follow a couple steps (included in the file)
.

### Simple setup

Create multiple express server / nodejs server and assign them to a domain like so:

```js
const express = require('express')
const manifold = require('express-manifold')

// create your express apps (or import them from another file)
const exampleApp = express()
const anotherApp = express()

exampleApp.get('/', (req, res) => {
    res.send('Hello World!').end()
})

anotherApp.get('/', (req, res) => {
    res.send('Hello World!').end()
})

// assign all apps to their domains
// you can also assingn one app to multiple domains
const switcher = manifold({
    "example.com": exampleApp,
    "another-example.com": anotherApp
})

switcher.listen(80)
```

### The `switcher` object

The `switcher` object itself acts just like an express app. That means that after you assigned your domains, you can add
fallback logic:

```js
/*[...]*/

const switcher = manifold({
    "example.com": exampleApp,
    "another-example.com": anotherApp
})

// use the returned switcher to add a fallback mechanism to all given servers
switcher.use((req, res) => {
    res.status(404).end()
})

switcher.listen(80)
```

### HTTP over TLS (HTTPS)
For https you have to pass a configuration object for the domain in question. Similar to the `https.createServer` options, pass the certificate in pem format as `cert` and the key (also in pem format) as `key`. Finally, add a second port to the `switcher.listen` function. For more info, see [Usage](#usage).

```js
/*[...]*/

const switcher = manifold({
    "example.com": {
        server: exampleApp,
        // feed your certfifcate and key like this
        cert: fs.readFileSync("path/to/certificate.crt"),
        key: fs.readFileSync("path/to/key.key"),
        // set "selfSigned" to true if your certificate is self signed
        // selfSigned: true
    },
})

// add a second port for https
switcher.listen(80, 443)
```

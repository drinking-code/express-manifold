# Express.js Manifold
_An express switch to host multiple express apps on one server._

- [Installation](#installation)
- [Usage](#usage)
  - [The `switcher` object](#the-switcher-object)
  - [HTTP over TLS (HTTPS)](#http-over-tls-https)

## Installation
```shell
npm i express-manifold
```

## Usage
Multiple domains may point to one IP address. With a normal express.js server you would then serve the same web-app / website to all domains pointing to that server. With `express-manifold` however, you can route different web-apps / websites over the same IP address to different domains.

![figure showing how express-manifold works](figure.svg)

### The only function
`require('express-manifold')(domains)`, where `domains` is a JavaScript object with the domains of the server as the keys, and either a `<net.Server>` class, an express server, or an object as the value.  
If given a `<net.Server>` class, or an express server, this server will only listen on the first port given (see [switcher.listen](#switcherlistenhttpport-httpsport)).  
If given an object, it must follow the following structure.  

| Field | Type | Description | Required | Default |
|---|---|---|---|---|
| `server` | `<net.Server>`\|express-server | The server for the given domain | yes | - |
| `httpsServer` | `<net.Server>`\|express-server | Another server, if you want to have a different server for https. If not given, the `server` value will be used. | no | - |
| `cert` | string\|buffer | The certificate in PEM format for the given domain. | only if `forceHttps`is `true` | - |
| `key` | string\|buffer | The private keys in PEM format for the given domain. | only if `forceHttps`is `true` | - |
| `selfSigned` | boolean | Whether the certificate given is self-signed or not. Should be `false` or omitted during production. | no | `false` |
| `preferHttps` | boolean | Will redirect http to https if `Upgrade-Insecure-Requests` is set to "1", and certificate and private keys are provided. | no | `true` |
| `forceHttps` | boolean | Will always redirect http to https, regardless of the `preferHttps` mechanism. | no | `false` |

The server given for `server` will listen on both the first, and the second port, except if `httpsServer` is given. Then, the server given for `server` will listen on the first port and server given for `httpsServer` will listen on the second port.

This function returns an express server `switcher` which acts like an appended server. That means if you `.get()` a path that a server on a given domain does not handle, it will fallback to that function. (see [examples](#examples) for examples)

### `switcher.listen([httpPort[, httpsPort]])`

The returned `switcher`'s functions behave the same as in a normal express app, except for the `.listen()` function. Instead of using one port it will use two.
- The first port is meant to be the HTTP-port, and is used for all given servers for `server`. In production this should be `80`.
- The second port is meant to be the HTTPS-port, and is used for all given servers for `httpsServer`. In production this should be `443`.

## Examples
### Simple setup
Create multiple express server / nodejs server and assign them to a domain like so:

```js
const express = require('express')

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
const switcher = require('express-manifold')({
    "example.com": exampleApp,
    "another-example.com": anotherApp
})

switcher.listen(80)
```

### The `switcher` object
The `switcher` object itself acts just like an express app. That means that after you assigned your domains, you can add fallback logic:

```js
/*[...]*/

const switcher = require('express-manifold')({
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


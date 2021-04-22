# Express.js Manifold
_An express switch to host multiple express apps on one server._

- [Installation](#installation)
- [Usage](#usage)
  - [The `switcher` object](#the-switcher-object)
  - [Domains and Subdomains](#domains-and-subdomains)
  - [HTTP over TLS (HTTPS)](#http-over-tls-https)

## Installation
```shell
npm i express-manifold
```

## Usage
Multiple domains may point to one IP address. With a normal express.js server you would then serve the same web-app / website to all domains pointing to that server. With `express-manifold` however, you can route different web-apps / websites over the same IP address to different domains.

Create multiple express apps and assign them to a domain.

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
[...]

const switcher = require('express-manifold')({
    "example.com": exampleApp,
    "another-example.com": anotherApp
})

switcher.use((req, res) => {
    res.status(404).end()
})

switcher.listen(80)
```

### Domains and Subdomains

### HTTP over TLS (HTTPS)

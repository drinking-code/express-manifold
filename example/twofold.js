/**
*
* THIS EXAMPLE DOES NOT WORK OUT OF THE BOX,
* to make this work
* 0. have openssl installed
* 1. run `npm run generate-example-certificate`
* 2. change "example.com" in line 37 to "localhost"
* (3. change the ports in line 48)
*
* after you followed these steps, run `npm run example-twofold` to start the servers
* and visit localhost (or localhost:<first_port>) to see that exampleApp is handling the request.
*
* (Your browser may warn you about the invalid certificate. This is because generate-example-certificate
* generates a self-signed certificate, that the browser cannot validate. You can safely add an exception
* for this certificate.)
*
*/

const express = require('express')
const manifold = require('../main')
const fs = require('fs')

// create an express server
const exampleApp = express()
const anotherExample = express()

exampleApp.get('/', (req, res) => {
    res.send('Hello World!').end()
})

anotherExample.get('/', (req, res) => {
    res.send('Hello other World!').end()
})

// feed the server, certificate, and key into express-manifold
const switcher = manifold({
    "example.com": {
        server: exampleApp,
        // replace these with your certificate / key files for the given domain
        // or run `npm run generate-example-certificate` to create a certificate and key at these paths
        cert: fs.readFileSync("path/to/certificate.crt"),
        key: fs.readFileSync("path/to/key.key"),
        selfSigned: true
    },
    "another-example.com": anotherExample
})

switcher.listen(80, 443)

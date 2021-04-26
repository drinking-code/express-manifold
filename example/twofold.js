/*
*
* THIS EXAMPLE DOES NOT WORK OUT OF THE BOX,
* because:
* 1. the given domains do not point to the ip address this server runs on
* 2. the paths given for certificate and key are not files
*
*/

const express = require('express')
const fs = require('fs')
const https = require('https')
const tls = require('tls')

const exampleApp = express()

exampleApp.get('/', (req, res) => {
    res.send('Hello World!').end()
})

const switcher = require('../main')({
    "example.com": {
        server: exampleApp,
        // replace these with your certificate / key files for the given domain
        // cert: fs.readFileSync("path/to/certificate.pem"),
        // key: fs.readFileSync("path/to/key.pem")
    },
    "another-example.com": require('http').createServer(),
    "localhost": {
        server: exampleApp,
        cert: fs.readFileSync("/Users/johannes/localhost.crt"),
        key: fs.readFileSync("/Users/johannes/localhost.key")
    }
})

switcher.listen(8080, 5000)

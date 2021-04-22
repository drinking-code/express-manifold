const express = require('express')

const exampleApp = express()

exampleApp.get('/', (req, res) => {
    res.send('Hello World!').end()
})

const switcher = require('../main')({
    "example.com": exampleApp
})

switcher.listen(8080)

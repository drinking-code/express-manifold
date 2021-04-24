const express = require('express');
const net = require('net')
const https = require('https')
const httpSwitcher = express();
const httpsSwitcher = express();
const switcher = express();

const expressConstructor = express().constructor

function isServer(server) {
    return server.constructor === expressConstructor || server instanceof net.Server
}

function manifold(servers) {
    // input checks
    for (const host in servers) {
        if (!servers.hasOwnProperty(host)) continue

        if (servers[host].constructor === ({}).constructor) {
            if (!isServer(servers[host].server))
                throw new Error(`Value "server" for "${host}" is not a server.`)
            servers[host] = {
                server: servers[host].server,
                httpsServer: isServer(servers[host].httpsServer) ? servers[host].httpsServer : null,
                cert: typeof servers[host].cert === 'string' || Buffer.isBuffer(servers[host].cert)
                    ? servers[host].cert : null,
                key: typeof servers[host].key === 'string' || Buffer.isBuffer(servers[host].key)
                    ? servers[host].key : null,
                preferHttps: typeof servers[host].preferHttps === 'boolean' ? servers[host].preferHttps : true,
                forceHttps: typeof servers[host].preferHttps === 'boolean' ? servers[host].preferHttps : true,
            }
            if (servers[host].cert && servers[host].key) {
                servers[host]._https = true
                servers[host].httpsServer = https.createServer({
                    cert: servers[host].cert,
                    key: servers[host].key
                }, servers[host].httpsServer || servers[host].server)
            } else {
                servers[host]._https = false
                console.warn(`"${host}" will only listen on the first port as the certificate and keys are not given.`)
            }
        }

        if (!isServer(servers[host]))
            throw new Error(`Value for "${host}" is not a server.`)
    }

    // map functions of http and https server
    for (let func in switcher) {
        if (!switcher.hasOwnProperty(func)) continue
        if (typeof switcher[func] !== 'function') continue
        switcher[func] = (...data) => {
            httpSwitcher[func](...data)
            httpsSwitcher[func](...data)
        }
    }

    httpSwitcher.use((req, res, next) => {
        const host = req.get('Host').replace(/:\d+/, '')
        if (servers[host]?.server)
            servers[host].server(req, res, next)
        else
            next()
    })

    httpsSwitcher.use((req, res, next) => {
        const host = req.get('Host').replace(/:\d+/, '')
        if (servers[host])
            if (servers[host].httpsServer)
                servers[host].httpsServer(req, res, next)
            else
                return res.status(400).end()
        else
            next()
    })

    switcher.listen = (httpPort, httpsPort, ...args) => {
        httpSwitcher.listen(httpPort, ...args)
        httpsSwitcher.listen(httpsPort, ...args)
    }

    return switcher
}

module.exports = manifold

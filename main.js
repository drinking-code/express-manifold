const express = require('express');
const https = require('https')
const tls = require('tls')
const httpSwitcher = express();
const httpsSwitcher = express();
const switcher = express();

const expressConstructor = express().constructor
const isServer = server => server?.constructor === expressConstructor

function manifold(servers) {
    const secureContext = {};

    // check inputs and prepare them for use
    for (const host in servers) {
        if (!servers.hasOwnProperty(host)) continue

        // case: value is a server => create object with default settings
        // set preferHttps to false to prevent redirect to non-occupied https port
        if (isServer(servers[host]))
            servers[host] = {
                server: servers[host],
                httpsServer: null,
                cert: null,
                key: null,
                selfSigned: false,
                preferHttps: false,
                forceHttps: false,
            }

        // case: value is a object (includes all converted servers [above])
        if (servers[host].constructor === ({}).constructor) {
            // check if "server" field is a valid server
            if (!isServer(servers[host].server))
                throw new Error(`Value "server" for "${host}" is not a server.`)
            // sanitise object and set defaults
            servers[host] = {
                server: servers[host].server,
                // set server if "httpsServer" is a server
                httpsServer: isServer(servers[host].httpsServer) ? servers[host].httpsServer : null,
                // set certificate if "cert" is string or buffer
                cert: typeof servers[host].cert === 'string' || Buffer.isBuffer(servers[host].cert)
                    ? servers[host].cert : null,
                // set key if "key" is string or buffer
                key: typeof servers[host].key === 'string' || Buffer.isBuffer(servers[host].key)
                    ? servers[host].key : null,
                // set other options if they are booleans
                selfSigned: typeof servers[host].selfSigned === 'boolean' ? servers[host].selfSigned : false,
                preferHttps: typeof servers[host].preferHttps === 'boolean' ? servers[host].preferHttps : true,
                forceHttps: typeof servers[host].preferHttps === 'boolean' ? servers[host].preferHttps : false,
            }
            // if certificate and key are present
            if (servers[host].cert && servers[host].key) {
                // activate https
                servers[host]._https = true
                const certificate = {
                    cert: servers[host].cert,
                    key: servers[host].key,
                }
                // assign self signed certificate as authority
                if (servers[host].selfSigned)
                    certificate.ca = [servers[host].cert]
                // add the secure context to "secureContext" object for later use
                secureContext[host] = tls.createSecureContext(certificate).context
                // set "httpsServer" to be the "server" if no other listener is specified
                if (!servers[host].httpsServer)
                    servers[host].httpsServer = servers[host].server
            } else { // either certificate or key, or both were not given
                servers[host]._https = false
                console.warn(`\x1b[33mWARNING:\x1b[0m "${host}" will only listen on the first (HTTP) port as the certificate and keys are not given.`)
            }
        } else // this only activates if the value for the domain was neither a server (listener) nor a object
            throw new Error(`Value for "${host}" is not a server.`)
    }

    // map functions of http and https server
    for (let func in switcher) {
        if (!switcher.hasOwnProperty(func)) continue
        // skip all non-function properties
        if (typeof switcher[func] !== 'function') continue
        switcher[func] = (...data) => {
            httpSwitcher[func](...data)
            httpsSwitcher[func](...data)
        }
    }

    // default ports
    let ports = [80, 443]

    httpSwitcher.use((req, res, next) => {
        // get "host"; remove port number
        const host = req.get('Host').replace(/:\d+/, '')
        // check if server is given for domain
        if (!servers[host]?.server) return next()
        // check if redirect to https is suitable
        if (
            // http over tls is activated for this domain
            servers[host]._https &&
            // either "forceHttps" is set to true OR
            // "preferHttps" is set to true and browser prefers https
            (servers[host].forceHttps === true
                || (servers[host].preferHttps === true && req.get('Upgrade-Insecure-Requests') === '1'))
        ) // redirect redirect to corresponding https url (and add https port if not 443)
            return res.redirect('https://' + host + (ports[1] !== 443 ? (':' + ports[1]) : '') + req.url)
        else // https redirect is not suitable => let http server handle request
            servers[host].server(req, res, next);

    })

    httpsSwitcher.use((req, res, next) => {
        // get "host"; remove port number
        const host = req.get('Host').replace(/:\d+/, '')
        // check if domain is given at all
        if (servers[host]) return next()
        // check if https server is given for domain
        if (!servers[host].httpsServer) return res.status(400).end()

        servers[host].httpsServer(req, res, next)
    })

    switcher.listen = function listen() {
        // set ports if given
        ports = ports.map((port, i) =>
            arguments[i] === 'number' ? arguments[i] : port
        )

        const args = Array.from(arguments)
        const httpPort = args.shift()
        const httpsPort = args.shift()

        // listen http server
        const httpSwitcherServer = httpSwitcher.listen(httpPort, ...args)

        // listen https server
        const httpsSwitcherServer = https.createServer({
            SNICallback: (domain, callback) => {
                if (secureContext[domain])
                    callback(null, secureContext[domain])
                else
                    callback(new Error(`Certificate for ${domain} invalid or missing`))
            }
        }, httpsSwitcher).listen(httpsPort, ...args)

        return [httpSwitcherServer, httpsSwitcherServer]
    }

    return switcher
}

module.exports = manifold

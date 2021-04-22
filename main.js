const express = require('express');
const switcher = express();

function manifold(servers) {
    // input checks
    for (const host in servers) {
        if (!servers.hasOwnProperty(host)) continue
        if (servers[host].constructor !== express().constructor)
            throw new Error(`Value for "${host}" is not an express server.`)
    }

    switcher.use((req, res, next) => {
        const host = req.get('Host').replace(/:\d+/, '')
        console.log(
            (host.match(/\./g) || []).length > 1 // has subdomain
        )
        if (servers[host])
            servers[host](req, res, next)
        else
            next()
    })

    return switcher
}

module.exports = manifold

import { Sender, Receiver, EventNotification } from "evno"
import { DataFactory, Parser } from 'n3'
import { v4 as uuidv4 } from 'uuid'
import * as fs from 'fs'
import express from 'express'
import http from 'http'
import nunjucks from 'nunjucks'
import sassMiddleware from 'node-sass-middleware'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const { namedNode } = DataFactory

const stack = []

function delay(time) {
    return new Promise(resolve => setTimeout(resolve, time))
}

function addToStack(n, type) {
    stack.push({ type, notification: n, time: new Date() })
}

const options = {
    name: process.env.NAME,
    email: process.env.EMAIL,
    password: process.env.PASSWORD,
    idp: process.env.IDP,
    pollingFrequency: 10 * 1000,
    cache: true,
}

// init receiver 
const receiver = await Receiver.build(options)
const inboxUrl = await receiver.init(process.env.HOST)

const participants = await Promise.all(process.env.AGENTS.split(',')
    .filter((a) => a !== receiver.webId)
    .map(async (p) => {
        await receiver.grantAccess(inboxUrl, p)
        return receiver.fetchAgent(p)
    }))

// Init sender
const actor = {
    id: namedNode(receiver.webId), inbox: namedNode(inboxUrl)
}
const sender = await Sender.build(actor, options)

receiver.on('notification', async (n) => {
    console.log(`Received ${n.id.id} (${n.type.reduce((acc, curr) => acc + curr.id)})`)
    addToStack(n, 'received')
})
receiver.on('error', (e) => {
    console.log(e)
})
await receiver.start(inboxUrl)


const parser = new Parser(),
    rdfStream = fs.createReadStream('links.ttl')
parser.parse(rdfStream, async (error, quad) => {
    if (quad) {
        if (quad.predicate.value == "https://schema.org/subject") {
            // Start interaction
            await delay(30 * 1000)
            // send first offer
            const options = {
                id: namedNode(`urn:uuid:${uuidv4()}`),
                type: [namedNode('https://www.w3.org/ns/activitystreams#Relationship')],
                subject: quad.subject,
                relationship: quad.predicate,
                object: quad.object
            }
            const announce = EventNotification.announce(options, actor)
            await sender.send(announce, process.env.TARGET)
            addToStack(announce, 'sent')
        } else {
            // Start interaction
            await delay(20 * 1000)
            // send first offer
            const offer1 = EventNotification.offer(quad.subject, actor)
            await sender.send(offer1, process.env.TARGET)
            addToStack(offer1, 'sent')
        }
    }
})

/**
 * SETUP FRONTEND SERVER
 */

const app = express()

const paths = {
    scss: path.join(__dirname, 'frontend/scss'),
    views: path.join(__dirname, 'frontend/views'),
    public: path.join(__dirname, 'frontend/public')
}

nunjucks.configure(paths.views, {
    autoescape: true,
    express: app
})

app.use(sassMiddleware({
    src: paths.scss,
    dest: paths.public,
    indentedSyntax: true, // true = .sass and false = .scss
    sourceMap: true
}))

app.use(express.static(paths.public))
app.use(express.json())

app.get('/', (req, res, next) => {
    let data = {
        name: options.name,
        email: options.email,
        port: 3000,
        type: 'Data Node',
        inboxUrl,
        webId: receiver.webId,
        podUrl: process.env.HOST,
        participants,
        stack
    }

    res.render('timeline.njk', data)
})

app.post('/action/announce', (req, res, next) => {
    // { id : <uri>, target: <uri> }
    const data = res.body
    sender.announce(namedNode(data.id), undefined, namedNode(data.target))
})

app.get('/action/offer', (req, res, next) => {
    // { id : <uri>, target: <uri> }
    const data = res.body
    sender.offer(namedNode(data.id), undefined, namedNode(data.target))
})

app.get('/action/accept', (req, res, next) => {
    // { id : <uri> }
    const data = res.body
    const not = received.find(n => n.id.value === data.id)
    sender.accept(not)
})

app.get('/action/reject', (req, res, next) => {
    // { id : <uri> }
    const data = res.body
    const not = received.find(n => n.id.value === data.id)
    sender.reject(not)
})

const port = options.port || 3000
const server = http.createServer(app).listen(port, () => {
    console.log(`Listening on port ${port}`)
})

// Graceful shutdown   
process.on('SIGTERM', shutDown)
process.on('SIGINT', shutDown)

let connections = []

server.on('connection', connection => {
    connections.push(connection)
    connection.on('close', () => connections = connections.filter(curr => curr !== connection))
})

function shutDown() {
    console.log('Received kill signal, shutting down gracefully')
    server.close(() => {
        console.log('Closed out remaining connections')
        process.exit(0)
    })

    setTimeout(() => {
        console.error('Could not close connections in time, forcefully shutting down')
        process.exit(1)
    }, 10000)

    connections.forEach(curr => curr.end())
    setTimeout(() => connections.forEach(curr => curr.destroy()), 5000)
}



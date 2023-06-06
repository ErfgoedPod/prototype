import { Sender, Receiver, EventNotification } from "evno"
import { DataFactory, Parser } from 'n3'
import Frontend from './frontend/frontend.js'
import { v4 as uuidv4 } from 'uuid'
import * as fs from 'fs'

const { namedNode } = DataFactory

function delay(time) {
    return new Promise(resolve => setTimeout(resolve, time))
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

await receiver.grantAccess(inboxUrl, process.env.SENDER)

// Init sender
const actor = {
    id: namedNode(receiver.webId), inbox: namedNode(inboxUrl)
}
const sender = await Sender.build(actor, options)

// Init frontend
const frontend = new Frontend({
    name: options.name,
    email: options.email,
    port: 3000,
    type: 'Data Node',
    inboxUrl,
    webId: receiver.webId,
    podUrl: process.env.HOST,
    participants: [
        { uri: process.env.SENDER }
    ]
})
frontend.start()

receiver.on('notification', async (n) => {
    console.log(`Received ${n.id.id} (${n.type.reduce((acc, curr) => acc + curr.id)})`)
    frontend.inbox.push(n)
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
            const announce = EventNotification.announce({
                id: namedNode(`urn:uuid:${uuidv4()}`),
                type: [namedNode('https://www.w3.org/ns/activitystreams#Relationship')],
                subject: quad.subject,
                relationship: quad.predicate,
                object: quad.object
            }, actor)
            const res1 = await sender.send(announce, process.env.TARGET)
            frontend.outbox.push(announce)
        } else {
            // Start interaction
            await delay(20 * 1000)
            // send first offer
            const offer1 = EventNotification.offer(quad.subject, actor)
            const res1 = await sender.send(offer1, process.env.TARGET)
            frontend.outbox.push(offer1)
        }
    }
});



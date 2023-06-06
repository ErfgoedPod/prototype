import { Sender, Receiver, EventNotification } from "evno"
import { DataFactory } from 'n3'
const { namedNode } = DataFactory
import Frontend from './frontend/frontend.js'
import { v4 as uuidv4 } from 'uuid'

function delay(time) {
    return new Promise(resolve => setTimeout(resolve, time))
}

const options = {
    name: process.env.NAME,
    email: process.env.EMAIL,
    password: process.env.PASSWORD,
    idp: process.env.IDP,
    pollingFrequency: 10 * 1000,
    cache: true
}

const receiver = await Receiver.build(options)
const inboxUrl = await receiver.init(process.env.HOST)

await receiver.grantAccess(inboxUrl, process.env.SENDER)

const actor = {
    id: namedNode(receiver.webId), inbox: namedNode(inboxUrl)
}
const sender = await Sender.build(actor, options)

// Init frontend
const frontend = new Frontend({
    name: options.name,
    email: options.email,
    port: 3000,
    type: 'Service Node',
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

    if (n.isType(namedNode('https://www.w3.org/ns/activitystreams#Offer'))){
        await delay(20 * 1000)
        const accept = EventNotification.accept(n, actor)
        const res = await sender.send(accept)
        frontend.outbox.push(accept)
        console.log(`Sent accept: ${res.statusText}`)
    } else {
        await delay(30 * 1000)
        const announce = EventNotification.create({
            id: namedNode(`urn:uuid:${uuidv4()}`),
            type: [namedNode('https://www.w3.org/ns/activitystreams#Relationship')],
            subject: n.object.object,
            relationship: namedNode('https://schema.org/subjectOf'),
            object: quad.object.subject
        }, actor)
    }


})
receiver.on('error', (e) => {
    console.log(e)
})

await receiver.start(inboxUrl)




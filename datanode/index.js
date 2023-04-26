import { Sender, Receiver } from "evno"
import { DataFactory } from 'n3'
const { namedNode } = DataFactory

function delay(time) {
    return new Promise(resolve => setTimeout(resolve, time))
}

const options = {
    name: process.env.NAME,
    email: process.env.EMAIL,
    password: process.env.PASSWORD,
    idp: process.env.IDP
}

const receiver = await Receiver.build(options)
const inboxUrl = await receiver.init(process.env.HOST)

await receiver.grantAccess(inboxUrl, process.env.SENDER)

const actor = { 
    id: namedNode(receiver.webId), inbox: namedNode(inboxUrl) 
}
const sender = await Sender.build(actor, options)

receiver.on('notification', async (n) => {
    console.log(`Received ${n.id.id} (${n.type.reduce((acc, curr) => acc + curr.id)})`)
    console.log(await n.serialize())
})
receiver.on('error', (e) => {
    console.log(e)
})
await receiver.start(inboxUrl)

// Start interaction
await delay(5 * 1000)
console.log(process.env.TARGET)
const res1 = await sender.offer(namedNode('http://example.org/objectA'), process.env.TARGET)
console.log(await res1.text())

await delay(20 * 1000)
const res2 = await sender.offer(namedNode('http://example.org/objectB'), process.env.TARGET)
console.log(await res2.text())




import { Sender, Receiver } from "evno"
import { DataFactory } from 'n3'
const { namedNode } = DataFactory

const options = {
    name: process.env.NAME,
    email: process.env.EMAIL,
    password: process.env.PASSWORD,
    idp: process.env.IDP
}

const receiver = await Receiver.build(options);
const inboxUrl = await receiver.init(process.env.HOST)

await receiver.grantAccess(inboxUrl, process.env.SENDER)

const actor = { 
    id: namedNode(receiver.webId), inbox: namedNode(inboxUrl) 
}
const sender = await Sender.build(actor, options)

receiver.on('notification', async (n) =>{
    console.log(`Received ${n.id.id} (${n.type.reduce((acc, curr) => acc + curr.id )})`)
    console.log(await n.serialize())

    const res = await sender.accept(n)
    console.log(`Sent accept: ${res.statusText}`)
})
receiver.on('error', (e) =>{
    console.log(e)
})

await receiver.start(inboxUrl)




import { Sender, Receiver } from "evno"
import { DataFactory } from 'n3'
const { namedNode } = DataFactory

const options = {
    name: process.env['NAME'],
    email: process.env['EMAIL'],
    password: process.env['PASSWORD'],
    idp: process.env['IDP']
}

const receiver = await Receiver.build(options);
const inboxUrl = await receiver.init(process.env['HOST'])

const sender = Sender.build({id: namedNode(receiver.webId)}, options)

receiver.on('notification', (n) =>{
    console.log(n.serialise())
    sender.accept(n)
})
receiver.on('error', (e) =>{
    console.log(e)
})

await receiver.start(inboxUrl)




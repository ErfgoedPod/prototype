import express from 'express'
import http from 'http'
import nunjucks from 'nunjucks'
import sassMiddleware from 'node-sass-middleware'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export default class Frontend {
    _inbox = []
    _outbox = []
    server

    constructor(options = {}) {
        this.port = options.port || 3000

        const app = express()

        const paths = {
            scss: path.join(__dirname, 'scss'),
            views: path.join(__dirname, 'views'),
            public: path.join(__dirname, 'public')
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

        app.get('/', (req, res, next) => {

            let data = {
                ...options,
                inbox: this.inbox,
                outbox: this.outbox,
            }

            res.render('index.njk', data)
        })

        app.get('/received', (req, res, next) => {
            res.json(this._inbox)
        })

        app.get('/sent', (req, res, next) => {
            res.json(this._outbox)
        })

        this.server = http.createServer(app)
    }

    start() {
        const server = this.server.listen(this.port, () => {
            console.log(`Listening on port ${this.port}`)
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
    }

    get outbox() {
        return this._outbox
    }

    get inbox() {
        return this._inbox
    }

}
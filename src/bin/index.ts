/**
 * Module dependencies.
 */
import http from 'http';
import https from 'https';
import app from '../app';
import config from '../config';
import db from '../db/postgre.db';

/**
 * Get port from environment and store in Express.
 */
const port = normalizePort(config.PORT);

app.set('port', port);

/**
 * Connect to DB
 */
db.connect();

/**
 * Create HTTP / HTTPS server.
 */
let server: http.Server | https.Server;
server = http.createServer(app);

/**
 * Listen on provided port, on all network interfaces.
 */
try {
    server.listen(port);
    server.on('error', onError);
    server.on('listening', onListening);
} catch (e) {
    console.error(e);
}

/**
 * Normalize a port into a number, string, or false.
 */
function normalizePort(val: string): string | number | boolean {
    const port = parseInt(val, 10);

    if (Number.isNaN(port)) {
        // named pipe
        return val;
    }

    if (port >= 0) {
        // port number
        return port;
    }

    return false;
}

/**
 * Event listener for HTTP server "error" event.
 */
function onError(error: NodeJS.ErrnoException) {
    if (error.syscall !== 'listen') {
        throw error;
    }

    const bind = typeof port === 'string' ? `Pipe ${port}` : `Port ${port}`;

    // handle specific listen errors with friendly messages
    switch (error.code) {
        case 'EACCES':
            console.error(`${bind} requires elevated privileges`);
            process.exit(1);
        case 'EADDRINUSE':
            console.error('Address in use');
            process.exit(1);
        default:
    }
}

/**
 * Event listener for HTTP server "listening" event.
 */
function onListening() {
    const addr = server.address();
    const bind =
        typeof addr === 'string' ? `pipe ${addr}` : `port ${addr?.port}`;

    console.info(`⚡️ Listening on ${bind} as ${config.NODE_ENV}`);
}
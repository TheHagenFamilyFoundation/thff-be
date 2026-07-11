//packages
import http from 'http';
import express from 'express';
import helmet from "helmet";
import cors from 'cors';
import bodyParser from 'body-parser';
//config
import { Config } from './config/index.js';

//routes
import routes from './routes/index.js';
//realtime
import { initSocket, closeSocket } from './socket/index.js';

const app = express();
const port = Config.appPort;

// app.use(bearerToken());
app.use(cors());
app.use(bodyParser.json());

app.use(helmet())

routes(app);

// Wrap Express in an HTTP server so Socket.IO can share the same port.
const server = http.createServer(app);
initSocket(server);

server.listen(port, () => {
  console.log(`THFF listening on port ${port}`)
})

// Graceful shutdown: close sockets + Redis, then the HTTP server.
const shutdown = async (signal) => {
  console.log(`Received ${signal}, shutting down...`);
  // Force-exit if cleanup hangs.
  const forceExit = setTimeout(() => process.exit(1), 10000);
  forceExit.unref();
  try {
    // io.close() also closes the underlying HTTP server.
    await closeSocket();
  } catch (err) {
    console.error(`Error during shutdown: ${err.message}`);
  }
  process.exit(0);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

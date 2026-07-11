import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';
import Config from '../config/config.js';
import Logger from '../utils/logger.js';

let io = null;
let redisPubClient = null;
let redisSubClient = null;

const meetingRoom = (meetingId) => `meeting:${meetingId}`;

/**
 * Attach the Redis adapter so events fan out across multiple server instances.
 * Fire-and-forget: on any failure we log and keep the default in-memory adapter,
 * so a single instance (or a Redis outage) still works.
 */
async function attachRedisAdapter(server, url) {
  try {
    redisPubClient = createClient({
      url,
      socket: {
        connectTimeout: 10000,
        // Bounded backoff so a misconfigured Redis doesn't retry forever.
        reconnectStrategy: (retries) =>
          retries > 10 ? false : Math.min(retries * 200, 3000),
      },
    });
    redisSubClient = redisPubClient.duplicate();

    redisPubClient.on('error', (err) =>
      Logger.error(`Redis pub client error: ${err.message}`)
    );
    redisSubClient.on('error', (err) =>
      Logger.error(`Redis sub client error: ${err.message}`)
    );

    await Promise.all([redisPubClient.connect(), redisSubClient.connect()]);
    server.adapter(createAdapter(redisPubClient, redisSubClient));
    Logger.info('Socket.IO Redis adapter connected');
  } catch (err) {
    Logger.error(
      `Socket.IO Redis adapter failed, falling back to in-memory: ${err.message}`
    );
  }
}

/** Verify a JWT from the socket handshake; mirrors the HTTP authn middleware. */
function verifyHandshake(socket) {
  let token =
    socket.handshake?.auth?.token ||
    socket.handshake?.headers?.authorization ||
    socket.handshake?.query?.token;

  if (typeof token === 'string' && token.startsWith('Bearer ')) {
    token = token.slice(7);
  }

  if (!token) {
    return null;
  }

  const decoded = jwt.verify(token, process.env.TOKEN_SECRET);
  if (!decoded?.userID) {
    return null;
  }
  return decoded;
}

/** Attach a Socket.IO server to the given HTTP server. Safe to call once at boot. */
export function initSocket(server) {
  io = new Server(server, {
    // Mirror the permissive HTTP CORS (see app.js). Tighten alongside it if locked down.
    cors: { origin: true, credentials: true },
    // WebSocket-only: avoids the multi-request polling handshake, so no ALB
    // sticky sessions are required when running multiple instances.
    transports: ['websocket'],
  });

  io.use((socket, next) => {
    try {
      const decoded = verifyHandshake(socket);
      if (!decoded) {
        return next(new Error('Not authorized'));
      }
      socket.decoded = decoded;
      return next();
    } catch (err) {
      Logger.error(`Socket auth failed: ${err.message}`);
      return next(new Error('Not authorized'));
    }
  });

  io.on('connection', (socket) => {
    socket.on('meeting:join', (meetingId) => {
      if (meetingId) {
        socket.join(meetingRoom(meetingId));
      }
    });

    socket.on('meeting:leave', (meetingId) => {
      if (meetingId) {
        socket.leave(meetingRoom(meetingId));
      }
    });
  });

  if (Config.redisURL) {
    attachRedisAdapter(io, Config.redisURL);
  } else {
    Logger.info('Socket.IO using in-memory adapter (no REDIS_URL configured)');
  }

  Logger.info('Socket.IO initialized');
  return io;
}

export function getIO() {
  return io;
}

/**
 * Realtime subsystem status for health checks.
 * `redis` is DISABLED when no REDIS_URL is set, UP when both clients are ready,
 * otherwise DOWN (in which case the server transparently uses the in-memory adapter).
 */
export function getRealtimeStatus() {
  const redisConfigured = !!Config.redisURL;
  let redis = 'DISABLED';
  let adapter = 'in-memory';

  if (redisConfigured) {
    const ready = !!redisPubClient?.isReady && !!redisSubClient?.isReady;
    redis = ready ? 'UP' : 'DOWN';
    adapter = ready ? 'redis' : 'in-memory';
  }

  return {
    socket: io ? 'UP' : 'DOWN',
    connectedClients: io?.engine?.clientsCount ?? 0,
    adapter,
    redis,
  };
}

/** Gracefully close the socket server and Redis clients (called on shutdown signals). */
export async function closeSocket() {
  try {
    if (io) {
      await io.close();
    }
  } catch (err) {
    Logger.error(`Error closing Socket.IO: ${err.message}`);
  }
  for (const client of [redisPubClient, redisSubClient]) {
    try {
      if (client?.isOpen) {
        await client.quit();
      }
    } catch (err) {
      Logger.error(`Error closing Redis client: ${err.message}`);
    }
  }
}

/**
 * Broadcast the latest (populated) meeting to everyone viewing it.
 * No-op if sockets are not initialized (e.g. in scripts/tests).
 */
export function emitMeetingUpdate(meeting) {
  if (!io || !meeting) {
    return;
  }
  const id = String(meeting._id || meeting.id || '');
  if (!id) {
    return;
  }
  io.to(meetingRoom(id)).emit('meeting:updated', meeting);
}

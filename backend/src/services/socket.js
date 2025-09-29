import { Server } from 'socket.io';

let io;

export const setupSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.SOCKET_CORS_ORIGIN?.split(',') || '*',
      credentials: true
    }
  });
  io.on('connection', (socket) => {
    // could join rooms by role/user later
  });
};

export const notifyAll = (event, payload) => {
  if (io) io.emit(event, payload);
};

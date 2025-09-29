import http from 'http';
import app from './app.js';
import { setupSocket } from './services/socket.js';

const port = process.env.PORT || 4000;
const server = http.createServer(app);

setupSocket(server);

server.listen(port, () => {
  console.log(`[API] Listening on port ${port}`);
});

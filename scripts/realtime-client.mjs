import { io } from 'socket.io-client';

const baseUrl = process.env.BASE_URL ?? 'http://localhost:3000';
const token = process.env.JWT;

if (!token) {
  console.error('Missing JWT env var');
  process.exit(1);
}

const socket = io(`${baseUrl}/realtime`, {
  auth: { token },
  transports: ['websocket'],
});

socket.on('connect', () => {
  console.log('connected', socket.id);
});

socket.on('realtime.connected', (payload) => {
  console.log('realtime.connected', payload);
});

socket.on('test.notification', (payload) => {
  console.log('test.notification', payload);
});

socket.on('realtime.error', (payload) => {
  console.log('realtime.error', payload);
});

socket.on('disconnect', (reason) => {
  console.log('disconnect', reason);
});


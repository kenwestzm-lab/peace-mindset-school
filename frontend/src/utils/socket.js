import { io } from 'socket.io-client';

let socket = null;

export const connectSocket = (token, userId, role) => {
  if (socket?.connected) return socket;

  const URL = import.meta.env.VITE_SOCKET_URL || 'https://peace-mindset-backend.onrender.com';

  socket = io(URL, {
    auth: { token },
    transports: ['websocket'],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 10000,
    forceNew: false,
  });

  socket.on('connect', () => {
    socket.emit('join', userId);
    if (role === 'admin') socket.emit('join_admin', userId);
    if (role === 'developer') socket.emit('join_developer');
  });

  return socket;
};

export const getSocket = () => socket;

export const disconnectSocket = () => {
  if (socket) { socket.disconnect(); socket = null; }
};

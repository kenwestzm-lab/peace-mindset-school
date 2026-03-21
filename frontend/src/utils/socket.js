import { io } from 'socket.io-client';

let socket = null;

export const connectSocket = (token, userId, role) => {
  if (socket?.connected) return socket;

  const URL = import.meta.env.VITE_SOCKET_URL || window.location.origin;

  socket = io(URL, {
    auth: { token },
    transports: ['websocket', 'polling'],
  });

  socket.on('connect', () => {
    console.log('🔌 Socket connected');
    socket.emit('join', userId);
    if (role === 'admin') socket.emit('join_admin');
    if (role === 'developer') socket.emit('join_developer');
  });

  socket.on('disconnect', () => console.log('🔌 Socket disconnected'));
  socket.on('connect_error', (err) => console.error('Socket error:', err));

  return socket;
};

export const getSocket = () => socket;

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

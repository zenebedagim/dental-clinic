/**
 * Socket.io Client Service
 * Manages WebSocket connection to server
 */

import { io } from 'socket.io-client';

let socket = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;

/**
 * Initialize socket connection
 */
const initializeSocket = () => {
  if (socket?.connected) {
    return socket;
  }

  const token = localStorage.getItem('token');
  if (!token) {
    // Only log in development mode to reduce noise
    if (import.meta.env.DEV) {
      console.debug('No token found, cannot initialize socket');
    }
    return null;
  }

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  socket = io(API_URL, {
    auth: {
      token,
    },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: MAX_RECONNECT_ATTEMPTS,
  });

  // Connection event handlers
  socket.on('connect', () => {
    console.log('Socket connected:', socket.id);
    reconnectAttempts = 0;
  });

  socket.on('disconnect', (reason) => {
    console.log('Socket disconnected:', reason);
    if (reason === 'io server disconnect') {
      // Server disconnected, reconnect manually
      socket.connect();
    }
  });

  socket.on('connect_error', (error) => {
    reconnectAttempts++;
    // Only log errors in development mode or if it's not a connection refused error
    if (import.meta.env.DEV && reconnectAttempts <= MAX_RECONNECT_ATTEMPTS) {
      console.debug('Socket connection error:', error.message);
    }
    if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      // Stop trying to reconnect after max attempts
      socket.disconnect();
      if (import.meta.env.DEV) {
        console.debug('Max reconnection attempts reached. WebSocket server may be unavailable.');
      }
    }
  });

  socket.on('reconnect', (attemptNumber) => {
    console.log('Socket reconnected after', attemptNumber, 'attempts');
    reconnectAttempts = 0;
  });

  socket.on('reconnect_attempt', (attemptNumber) => {
    console.log('Socket reconnection attempt', attemptNumber);
  });

  socket.on('reconnect_failed', () => {
    if (import.meta.env.DEV) {
      console.debug('Socket reconnection failed. WebSocket server may be unavailable.');
    }
  });

  return socket;
};

/**
 * Get socket instance
 */
const getSocket = () => {
  if (!socket) {
    return initializeSocket();
  }
  return socket;
};

/**
 * Disconnect socket
 */
const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
    reconnectAttempts = 0;
  }
};

/**
 * Reconnect socket (useful after token refresh)
 */
const reconnectSocket = () => {
  disconnectSocket();
  return initializeSocket();
};

/**
 * Check if socket is connected
 */
const isConnected = () => {
  return socket?.connected || false;
};

/**
 * Emit event
 */
const emit = (event, data) => {
  if (socket?.connected) {
    socket.emit(event, data);
  } else {
    console.warn('Socket not connected, cannot emit:', event);
  }
};

/**
 * Listen to event
 */
const on = (event, callback) => {
  if (socket) {
    socket.on(event, callback);
  }
};

/**
 * Remove event listener
 */
const off = (event, callback) => {
  if (socket) {
    socket.off(event, callback);
  }
};

export {
  initializeSocket,
  getSocket,
  disconnectSocket,
  reconnectSocket,
  isConnected,
  emit,
  on,
  off,
};


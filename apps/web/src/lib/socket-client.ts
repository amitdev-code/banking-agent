import { io, type Socket } from 'socket.io-client';

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001';

// ─── Legacy pipeline socket (/crm namespace) ─────────────────────────────────

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(`${API_URL}/crm`, {
      withCredentials: true,
      autoConnect: false,
      transports: ['websocket', 'polling'],
    });
  }
  return socket;
}

export function disconnectSocket(): void {
  if (socket?.connected) {
    socket.disconnect();
  }
  socket = null;
}

// ─── New agent session socket (/crm-session namespace) ────────────────────────

let chatSocket: Socket | null = null;

export function getChatSocket(): Socket {
  if (!chatSocket) {
    chatSocket = io(`${API_URL}/crm-session`, {
      withCredentials: true,
      autoConnect: false,
      transports: ['websocket', 'polling'],
    });
  }
  return chatSocket;
}

export function disconnectChatSocket(): void {
  if (chatSocket?.connected) {
    chatSocket.disconnect();
  }
  chatSocket = null;
}

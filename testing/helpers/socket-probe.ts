import { io, Socket } from 'socket.io-client';

export interface RecordedSocketEvent {
  event: string;
  data: any;
  receivedAt: number;
}

export class SocketProbe {
  private socket: Socket | null = null;
  public events: RecordedSocketEvent[] = [];

  constructor(private url: string = 'http://localhost:5000') {}

  connect(token: string) {
    this.socket = io(this.url, {
      auth: { token },
      transports: ['websocket', 'polling']
    });

    const monitoredEvents = [
      'new_booking_request',
      'booking_taken',
      'booking_updated',
      'removeVendorBooking',
      'admin_booking_requested',
      'new_job_assigned',
      'live_location_update',
      'notification',
      'user_waiting'
    ];

    monitoredEvents.forEach(ev => {
      this.socket?.on(ev, (data) => {
        this.events.push({
          event: ev,
          data,
          receivedAt: Date.now()
        });
      });
    });
  }

  async waitForEvent(eventName: string, timeoutMs: number = 15000): Promise<RecordedSocketEvent> {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const match = this.events.find(e => e.event === eventName);
      if (match) return match;
      await new Promise(r => setTimeout(r, 100));
    }
    throw new Error(`Timeout waiting for socket event: ${eventName} after ${timeoutMs}ms`);
  }

  emit(eventName: string, ...args: any[]) {
    this.socket?.emit(eventName, ...args);
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  clear() {
    this.events = [];
  }
}


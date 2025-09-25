// Shared domain models

export interface EventType {
  eventId: string;
  title: string;
  description: string;
  date: string; // ISO string
  location: string;
  price: number;
  totalTickets: number;
  availableTickets: number; // 👈 this must exist
  createdAt: string;
  updatedAt: string;
  featured?: boolean;
  imageUrl?: string | null;
}

export interface TicketType {
  ticketId: string;
  eventId: string;
  orderId: string;
  userId?: string;
  attendeeEmail: string;
  qrCodeData: string; // signed string (JWT or HMAC)
  createdAt: string; // ISO string
  used: boolean;
}

export interface OrderType {
  id: string;
  userId?: string;
  attendeeEmail: string;
  eventId: string;
  ticketIds: string[];
  createdAt: string; // ISO string
}

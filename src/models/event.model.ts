export interface Theme {
  style: 'Owanbe Vibrant' | 'Royal Gold' | 'Modern Clean';
  styleClass: string;
  colors: string[];
}

export interface WeddingEvent {
  coupleNames: string;
  eventDate: string;
  theme: Theme;
  qrCodeUrl?: string;
  coverPhotoUrl?: string;
  startTime?: string; // ISO string
  endTime?: string;   // ISO string
  strictMode?: boolean;
  id?: string;
  ownerId?: string;
}

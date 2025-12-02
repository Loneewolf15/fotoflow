import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../environments/environment';
import { firstValueFrom } from 'rxjs';
import { WeddingEvent } from '../models/event.model';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class EventService {
  private authService = inject(AuthService);
  private http = inject(HttpClient);
  private readonly _event = signal<WeddingEvent | null>(null);
  public readonly event = this._event.asReadonly();

  constructor() {
    const savedEventId = localStorage.getItem('currentEventId');
    if (savedEventId) {
      this.loadEvent(savedEventId);
    }
  }

  async createEvent(eventData: WeddingEvent): Promise<void> {
    try {
      const hostId = this.authService.currentUser()?.user_id;
      if (!hostId) throw new Error('User not authenticated');

      const payload = {
        id: eventData.id,
        host_id: hostId,
        couple_names: eventData.coupleNames,
        event_date: eventData.eventDate,
        start_time: eventData.startTime,
        end_time: eventData.endTime,
        theme: eventData.theme,
        strict_mode: eventData.strictMode ? 1 : 0,
        cover_photo_url: eventData.coverPhotoUrl?.replace(environment.backendUrl, ''),
        qr_code_url: eventData.qrCodeUrl
      };

      const response = await firstValueFrom(this.http.post<{ status: boolean, message: string, data: any }>(
        `${environment.backendUrl}/events/create`,
        payload
      ));

      if (!response.status) {
        throw new Error(response.message);
      }

      const createdEvent = { ...eventData, id: response.data.id };
      this._event.set(createdEvent);
      localStorage.setItem('currentEventId', createdEvent.id);

    } catch (error: any) {
      console.error('Error creating event:', error);
      throw error;
    }
  }

  async loadEvent(eventId: string): Promise<void> {
    try {
      const response = await firstValueFrom(this.http.get<{ status: boolean, data: any }>(
        `${environment.backendUrl}/events/get/${eventId}`
      ));

      if (response.status && response.data) {
        const event = this.mapBackendEvent(response.data);
        this._event.set(event);
        localStorage.setItem('currentEventId', eventId);
      }
    } catch (error) {
      console.error('Error loading event:', error);
    }
  }

  async uploadCoverPhoto(file: File, targetEventId?: string): Promise<string> {
    console.log(`Uploading cover photo to library...`);

    const formData = new FormData();
    formData.append('cover_photo', file);

    const hostId = this.authService.currentUser()?.user_id;
    if (hostId) {
      formData.append('host_id', hostId);
    }

    // NOTE: We intentionally do NOT set event_id here
    // This uploads to the library only, without updating any event
    // To update an event, use updateEventCover() separately

    try {
      const uploadResponse = await firstValueFrom(this.http.post<{ status: boolean, message: string, data: { url: string } }>(`${environment.backendUrl}/events/upload_cover`,
        formData
      ));

      if (!uploadResponse.status) {
        throw new Error(uploadResponse.message || 'Upload failed');
      }

      const publicUrl = uploadResponse.data.url;
      console.log('Cover photo uploaded to library, public URL:', publicUrl);

      return publicUrl;
    } catch (error) {
      console.error('Upload Error:', error);
      throw error;
    }
  }

  async updateEventCover(eventId: string, coverPhotoUrl: string): Promise<void> {
    const response = await firstValueFrom(
      this.http.post<{ status: boolean, message: string }>(
        `${environment.backendUrl}/events/update_event_cover`,
        { event_id: eventId, cover_photo_url: coverPhotoUrl }
      )
    );

    if (!response.status) {
      throw new Error(response.message || 'Failed to update event cover');
    }
  }

  setEvent(event: WeddingEvent): void {
    this._event.set(event);
    if (event.id) {
      this.loadEvent(event.id);
    }
  }

  clearEvent(): void {
    this._event.set(null);
    localStorage.removeItem('currentEventId');
  }

  async getEvents(): Promise<WeddingEvent[]> {
    try {
      const hostId = this.authService.currentUser()?.user_id;
      if (!hostId) return [];

      const response = await firstValueFrom(this.http.get<{ status: boolean, message: string, data: any[] }>(
        `${environment.backendUrl}/events/get_host_events/${hostId}`
      ));

      if (response.status && response.data) {
        return response.data.map(this.mapBackendEvent);
      }
      return [];
    } catch (error) {
      console.error('Error fetching events:', error);
      return [];
    }
  }

  async getCoverPhotoHistory(hostId: string): Promise<any[]> {
    try {
      const response = await firstValueFrom(this.http.get<{ status: boolean, message: string, data: any[] }>(
        `${environment.backendUrl}/events/get_cover_history/${hostId}`
      ));

      if (response.status && response.data) {
        return response.data.map(item => ({
          ...item,
          image_url: item.image_url && !item.image_url.startsWith('http')
            ? `${environment.backendUrl}${item.image_url}`
            : item.image_url
        }));
      }
      return [];
    } catch (error) {
      console.error('Error fetching cover photo history:', error);
      return [];
    }
  }

  getEventStatus(): 'upcoming' | 'active' | 'ended' {
    const event = this._event();
    if (!event) return 'ended';

    const now = new Date();

    // Parse start time
    let start: Date;
    if (event.startTime) {
      start = new Date(event.startTime);
    } else if (event.eventDate) {
      start = new Date(event.eventDate);
      start.setHours(0, 0, 0, 0);
    } else {
      return 'active'; // Fallback
    }

    // Parse end time
    let end: Date;
    if (event.endTime) {
      end = new Date(event.endTime);
    } else if (event.eventDate) {
      end = new Date(event.eventDate);
      end.setHours(23, 59, 59, 999);
    } else {
      // Default to 24 hours after start if no end time
      end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
    }

    if (now < start) return 'upcoming';
    if (now > end) return 'ended';
    return 'active';
  }

  private mapBackendEvent(data: any): WeddingEvent {
    let coverUrl = data.cover_photo_url;
    if (coverUrl && !coverUrl.startsWith('http')) {
      coverUrl = `${environment.backendUrl}${coverUrl}`;
    }

    return {
      id: data.id,
      coupleNames: data.couple_names,
      eventDate: data.event_date,
      startTime: data.start_time,
      endTime: data.end_time,
      strictMode: !!data.strict_mode,
      theme: data.theme,
      coverPhotoUrl: coverUrl,
      qrCodeUrl: data.qr_code_url,
      ownerId: data.host_id
    };
  }
}

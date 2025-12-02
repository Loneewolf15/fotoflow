import { Injectable, inject, signal, effect } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../environments/environment';
import { firstValueFrom } from 'rxjs';
import { Photo } from '../models/photo.model';
import { EventService } from './event.service';

@Injectable({
  providedIn: 'root'
})
export class PhotoService {
  private eventService = inject(EventService);
  private http = inject(HttpClient);

  private readonly _photos = signal<Photo[]>([]);
  public readonly photos = this._photos.asReadonly();

  constructor() {
    effect(() => {
      const event = this.eventService.event();
      if (event && event.id) {
        this.loadPhotos(event.id);
      } else {
        this._photos.set([]);
      }
    });
  }

  private async loadPhotos(eventId: string) {
    try {
      const response = await firstValueFrom(this.http.get<{ status: boolean, data: any[] }>(
        `${environment.backendUrl}/photos/get/${eventId}`
      ));

      if (response.status && response.data) {
        this._photos.set(response.data.map(this.mapBackendPhoto));
      }
    } catch (error) {
      console.error("Error loading photos:", error);
    }
  }

  async addPhoto(file: File, note: string): Promise<void> {
    const eventId = this.eventService.event()?.id;
    if (!eventId) throw new Error('No active event');

    const formData = new FormData();
    formData.append('event_id', eventId);
    formData.append('note', note);
    formData.append('photos', file);

    try {
      const response = await firstValueFrom(this.http.post<{ status: boolean, message: string, data: any[] }>(
        `${environment.backendUrl}/photos/add`,
        formData
      ));

      if (!response.status) {
        throw new Error(response.message || 'Failed to add photo');
      }

      // Optimistic update with returned data
      if (response.data && response.data.length > 0) {
        const newPhoto = this.mapBackendPhoto(response.data[0]);
        this._photos.update(photos => [newPhoto, ...photos]);
      }

    } catch (error) {
      console.error('Photo upload error:', error);
      throw error;
    }
  }

  private mapBackendPhoto(data: any): Photo {
    let imageUrl = data.image_url;
    if (imageUrl && !imageUrl.startsWith('http')) {
      imageUrl = `${environment.backendUrl}${imageUrl}`;
    }

    return {
      id: data.id,
      eventId: data.event_id,
      imageUrl: imageUrl,
      note: data.note,
      timestamp: data.timestamp || data.created_at
    };
  }
}

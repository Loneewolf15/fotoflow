import { Injectable, inject, signal, effect } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { Photo } from '../models/photo.model';
import { EventService } from './event.service';

@Injectable({
  providedIn: 'root'
})
export class PhotoService {
  private supabase = inject(SupabaseService).supabase;
  private eventService = inject(EventService);

  private readonly _photos = signal<Photo[]>([]);
  public readonly photos = this._photos.asReadonly();

  constructor() {
    effect(() => {
      const event = this.eventService.event();
      if (event && event.id) {
        this.loadPhotos(event.id);
        this.subscribeToPhotos(event.id);
      } else {
        this._photos.set([]);
      }
    });
  }

  private async loadPhotos(eventId: string) {
    const { data, error } = await this.supabase
      .from('photos')
      .select('*')
      .eq('event_id', eventId)
      .order('timestamp', { ascending: false });
    
    if (error) {
      console.error("Error loading photos:", error);
      return;
    }

    if (data) {
      this._photos.set(data.map(this.mapSupabasePhoto));
    }
  }

  private subscribeToPhotos(eventId: string) {
    this.supabase
      .channel('public:photos')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'photos', filter: `event_id=eq.${eventId}` }, payload => {
        const newPhoto = this.mapSupabasePhoto(payload.new);
        this._photos.update(photos => [newPhoto, ...photos]);
      })
      .subscribe();
  }

  async addPhoto(file: File, note: string): Promise<void> {
    const eventId = this.eventService.event()?.id;
    if (!eventId) throw new Error('No active event');

    const filePath = `events/${eventId}/${Date.now()}_${file.name}`;
    
    // 1. Upload to Storage
    const { error: uploadError } = await this.supabase.storage
      .from('photos')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    // 2. Get Public URL
    const { data: { publicUrl } } = this.supabase.storage
      .from('photos')
      .getPublicUrl(filePath);

    // 3. Save Metadata to DB
    const { error: dbError } = await this.supabase
      .from('photos')
      .insert({
        event_id: eventId,
        image_url: publicUrl,
        note,
        timestamp: new Date().toISOString()
      });

    if (dbError) throw dbError;
  }

  private mapSupabasePhoto(data: any): Photo {
    return {
      id: data.id,
      eventId: data.event_id,
      imageUrl: data.image_url,
      note: data.note,
      timestamp: data.timestamp
    };
  }
}

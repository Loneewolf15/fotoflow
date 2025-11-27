import { Injectable, inject, signal } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { WeddingEvent } from '../models/event.model';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class EventService {
  private supabase = inject(SupabaseService).supabase;
  private authService = inject(AuthService);
  private readonly _event = signal<WeddingEvent | null>(null);
  public readonly event = this._event.asReadonly();

  constructor() {
    const savedEventId = localStorage.getItem('currentEventId');
    if (savedEventId) {
      this.loadEvent(savedEventId);
    }
  }

  async createEvent(eventData: WeddingEvent): Promise<string> {
    const currentUser = this.authService.currentUser();
    
    // Check if event with same couple names exists for this user
    const { data: existingEvents } = await this.supabase
        .from('events')
        .select('id')
        .eq('owner_id', currentUser?.uid)
        .eq('couple_names', eventData.coupleNames);

    let resultData;
    let resultError;

    if (existingEvents && existingEvents.length > 0) {
        // Update existing event
        const existingId = existingEvents[0].id;
        console.log(`Event for ${eventData.coupleNames} already exists (${existingId}). Updating...`);
        
        const { data, error } = await this.supabase
            .from('events')
            .update({
                event_date: eventData.eventDate,
                start_time: eventData.startTime,
                end_time: eventData.endTime,
                theme: eventData.theme,
                cover_photo_url: eventData.coverPhotoUrl,
                strict_mode: eventData.strictMode,
                qr_code_url: eventData.qrCodeUrl
            })
            .eq('id', existingId)
            .select()
            .single();
            
        resultData = data;
        resultError = error;
    } else {
        // Insert new event
        const { data, error } = await this.supabase
          .from('events')
          .insert({
            id: eventData.id, // Use provided ID if available
            owner_id: currentUser?.uid,
            couple_names: eventData.coupleNames,
            event_date: eventData.eventDate,
            start_time: eventData.startTime,
            end_time: eventData.endTime,
            theme: eventData.theme,
            cover_photo_url: eventData.coverPhotoUrl,
            strict_mode: eventData.strictMode,
            qr_code_url: eventData.qrCodeUrl
          })
          .select()
          .single();
          
        resultData = data;
        resultError = error;
    }

    if (resultError) {
      console.error("Error creating/updating event:", resultError);
      throw resultError;
    }

    const newEvent = this.mapSupabaseEvent(resultData);
    this._event.set(newEvent);
    localStorage.setItem('currentEventId', newEvent.id!);
    return newEvent.id!;
  }

  async loadEvent(eventId: string): Promise<void> {
    const { data, error } = await this.supabase
      .from('events')
      .select('*')
      .eq('id', eventId)
      .single();

    if (error) {
      console.error("Error loading event:", error);
      return;
    }

    if (data) {
      this._event.set(this.mapSupabaseEvent(data));
      localStorage.setItem('currentEventId', eventId);
    }
  }

  async getEvents(): Promise<WeddingEvent[]> {
    const currentUser = this.authService.currentUser();
    if (!currentUser) return [];

    const { data, error } = await this.supabase
      .from('events')
      .select('*')
      .eq('owner_id', currentUser.uid)
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Error loading events:", error);
      return [];
    }

    return (data || []).map(this.mapSupabaseEvent);
  }

  async updateCoverPhoto(eventId: string, url: string): Promise<void> {
    console.log(`Updating cover photo URL for event ${eventId} to ${url}`);
    const { error } = await this.supabase
      .from('events')
      .update({ cover_photo_url: url })
      .eq('id', eventId);

    if (error) {
      console.error('Error updating cover photo URL in DB:', error);
      throw error;
    }
    
    this._event.update(e => e ? { ...e, coverPhotoUrl: url } : null);
  }

  async updateQrCodeUrl(eventId: string, url: string): Promise<void> {
    const { error } = await this.supabase
      .from('events')
      .update({ qr_code_url: url })
      .eq('id', eventId);

    if (error) throw error;
    
    this._event.update(e => e ? { ...e, qrCodeUrl: url } : null);
  }

  async uploadCoverPhoto(file: File, targetEventId?: string): Promise<string> {
    const eventId = targetEventId || this._event()?.id;
    if (!eventId) throw new Error('No active event');

    console.log(`Uploading cover photo for event ${eventId}...`);
    const filePath = `covers/${eventId}/${Date.now()}_${file.name}`;

    // 1. Upload to Storage
    const { error: uploadError } = await this.supabase.storage
      .from('photos')
      .upload(filePath, file);

    if (uploadError) {
      console.error('Supabase Storage Upload Error:', uploadError);
      throw uploadError;
    }

    // 2. Get Public URL
    const { data: { publicUrl } } = this.supabase.storage
      .from('photos')
      .getPublicUrl(filePath);

    console.log('Cover photo uploaded, public URL:', publicUrl);

    // 3. Update Event Record (ONLY if event exists in DB)
    // If we are in the creation flow (targetEventId provided), the event might not exist yet.
    // In that case, we just return the URL and let the createEvent call handle the INSERT.
    // However, uploadCoverPhoto is also used from the dashboard where the event DOES exist.
    // We can check if the event exists, or just try the update and ignore "row not found" error?
    // Better: If targetEventId is provided, we assume the caller handles the DB update (or insert).
    // If targetEventId is NOT provided (using this._event().id), we assume it's an update to an existing event.
    
    if (!targetEventId) {
        await this.updateCoverPhoto(eventId, publicUrl);
    } else {
        console.log('Skipping DB update for cover photo (assumed creation flow).');
    }

    console.log('uploadCoverPhoto returning publicUrl:', publicUrl);
    return publicUrl;
  }

  setEvent(event: WeddingEvent): void {
    this._event.set(event);
    if (event.id) {
        this.loadEvent(event.id);
    }
  }
  private mapSupabaseEvent(data: any): WeddingEvent {
    return {
      id: data.id,
      ownerId: data.owner_id,
      coupleNames: data.couple_names,
      eventDate: data.event_date,
      startTime: data.start_time,
      endTime: data.end_time,
      theme: data.theme,
      coverPhotoUrl: data.cover_photo_url,
      strictMode: data.strict_mode,
      qrCodeUrl: data.qr_code_url
    };
  }

  clearEvent(): void {
    this._event.set(null);
    localStorage.removeItem('currentEventId');
  }

  getEventStatus(): 'upcoming' | 'active' | 'ended' {
    const currentEvent = this.event();
    if (!currentEvent) return 'ended'; // Or handle as no event

    const now = new Date();
    
    // If no start time is set, assume active on the event date (or just active)
    if (!currentEvent.startTime) {
        // Fallback logic: if eventDate is today, it's active. If past, ended. If future, upcoming.
        // For simplicity in this MVP, without specific times, we might just say 'active' 
        // if it matches the date, but let's rely on the new fields for the "Professional" feature.
        return 'active'; 
    }

    const start = new Date(currentEvent.startTime);
    const end = currentEvent.endTime ? new Date(currentEvent.endTime) : new Date(start.getTime() + 24 * 60 * 60 * 1000); // Default 24h duration

    if (now < start) {
      return 'upcoming';
    } else if (now > end) {
      return 'ended';
    } else {
      return 'active';
    }
  }
}

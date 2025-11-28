import { ChangeDetectionStrategy, Component, output, inject, signal, computed } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { PhotoService } from '../../services/photo.service';
import { EventService } from '../../services/event.service';
import { QrCodeService } from '../../services/qr-code.service';

@Component({
  selector: 'app-host-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './host-dashboard.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HostDashboardComponent {
  authService = inject(AuthService);
  photoService = inject(PhotoService);
  eventService = inject(EventService);
  private router = inject(Router);
  private sanitizer = inject(DomSanitizer);
  private qrCodeService = inject(QrCodeService);

  photos = this.photoService.photos;
  
  coverPhotoUrl = signal<string | null>(this.eventService.event()?.coverPhotoUrl || null);
  
  coverPhotoStyle = computed(() => {
    const url = this.coverPhotoUrl();
    if (url) {
      return this.sanitizer.bypassSecurityTrustStyle(`url('${url}')`);
    }
    return null;
  });

  qrCodeUrl = signal<string | null>(this.eventService.event()?.qrCodeUrl || null);
  slideshowUrl = this.getSlideshowUrl();
  guestUrl = this.getGuestUrl();
  isLinkCopied = signal(false);
  isGuestLinkCopied = signal(false);
  
  recentEvents = signal<any[]>([]);

  constructor() {
    this.loadRecentEvents();
  }

  async loadRecentEvents() {
    const events = await this.eventService.getEvents();
    this.recentEvents.set(events);
    
    let currentEvent = this.eventService.event();

    // If no event is selected but we have events, select the first one (most recent)
    if (!currentEvent && events.length > 0) {
        this.eventService.setEvent(events[0]);
        currentEvent = events[0];
    }
    
    // If we have a current event (loaded by service or just set), regenerate its QR code too
    if (currentEvent && currentEvent.coverPhotoUrl) {
        this.regenerateQrCode(currentEvent);
    }
  }

  switchEvent(event: any) {
    this.eventService.setEvent(event);
    this.coverPhotoUrl.set(event.coverPhotoUrl);
    this.qrCodeUrl.set(event.qrCodeUrl);
    this.guestUrl = this.getGuestUrl(); // Update guest URL
    
    // Auto-regenerate QR code to ensure it has the latest cover photo style
    if (event.coverPhotoUrl) {
        this.regenerateQrCode(event);
    }
  }

  private async regenerateQrCode(event: any) {
      try {
          const newQrCodeUrl = await this.qrCodeService.generatePersonalizedQrCode(
              event.id,
              event.coupleNames,
              event.theme.colors,
              event.coverPhotoUrl,
              null // No local file, use URL
          );
          this.qrCodeUrl.set(newQrCodeUrl);
      } catch (err) {
          console.error('Failed to regenerate QR code', err);
      }
  }

  private getSlideshowUrl(): string {
    return `${window.location.origin}${window.location.pathname}?view=slideshow`;
  }

  private getGuestUrl(): string {
    const eventId = this.eventService.event()?.id;
    return eventId ? `${window.location.origin}/event/${eventId}` : '';
  }

  copySlideshowLink(): void {
    navigator.clipboard.writeText(this.slideshowUrl).then(() => {
      this.isLinkCopied.set(true);
      setTimeout(() => this.isLinkCopied.set(false), 2000);
    }).catch(err => {
      console.error('Failed to copy link: ', err);
      alert('Failed to copy link.');
    });
  }

  copyGuestLink(): void {
    navigator.clipboard.writeText(this.guestUrl).then(() => {
      this.isGuestLinkCopied.set(true);
      setTimeout(() => this.isGuestLinkCopied.set(false), 2000);
    }).catch(err => {
      console.error('Failed to copy link: ', err);
      alert('Failed to copy link.');
    });
  }

  async onCoverPhotoSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      
      try {
        // Show loading state or optimistic update if needed
        // For now, just upload
        const url = await this.eventService.uploadCoverPhoto(file);
        this.coverPhotoUrl.set(url);
        
        // Regenerate QR Code with new cover photo
        const currentEvent = this.eventService.event();
        if (currentEvent) {
             const newQrCodeUrl = await this.qrCodeService.generatePersonalizedQrCode(
                 currentEvent.id!,
                 currentEvent.coupleNames,
                 currentEvent.theme.colors,
                 url,
                 file
             );
             this.qrCodeUrl.set(newQrCodeUrl);
             
             // Update event in service/backend with new QR code URL
             // Note: Ideally backend should handle this, but for now we do it client-side
             // We need a way to update the event's QR code URL in the DB.
             // For now, let's just update the local state and the QR code display.
             // If we want to persist the new QR code image itself, we'd need to upload it too.
             // But since it's a data URL, we might just be storing the base64 or regenerating it.
             // The current implementation stores the data URL in the event object.
             // So we should update the event.
             const updatedEvent = { ...currentEvent, coverPhotoUrl: url, qrCodeUrl: newQrCodeUrl };
             await this.eventService.createEvent(updatedEvent); // Upsert updates
        }

      } catch (error) {
        console.error('Failed to upload cover photo', error);
        alert('Failed to upload cover photo. Please try again.');
      }
    }
  }

  generatePdf(): void {
    // For now, trigger the print view which acts as a PDF generator
    this.printQrCode();
  }
  
  printQrCode(): void {
      window.print();
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/']);
  }

  navigateToCreateEvent(): void {
    this.router.navigate(['/create-event']);
  }

  navigateToSlideshow(): void {
    this.router.navigate(['/slideshow']);
  }

  navigateToBookEditor(): void {
    this.router.navigate(['/book-editor']);
  }
}
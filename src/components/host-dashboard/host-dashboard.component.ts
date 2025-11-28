import { ChangeDetectionStrategy, Component, output, inject, signal, computed } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { PhotoService } from '../../services/photo.service';
import { EventService } from '../../services/event.service';

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
  }

  switchEvent(event: any) {
    this.eventService.setEvent(event);
    this.coverPhotoUrl.set(event.coverPhotoUrl);
    this.qrCodeUrl.set(event.qrCodeUrl);
    this.guestUrl = this.getGuestUrl(); // Update guest URL
    // Reload photos for the new event
    // The PhotoService effect should handle this if it depends on eventService.event()
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
      } catch (error) {
        console.error('Failed to upload cover photo', error);
        alert('Failed to upload cover photo. Please try again.');
      }
    }
  }

  generatePdf(): void {
    // Placeholder for premium PDF generation feature
    alert('PDF Album Generation is a premium feature coming soon!');
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
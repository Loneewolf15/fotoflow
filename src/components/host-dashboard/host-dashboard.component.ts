import { ChangeDetectionStrategy, Component, output, inject, signal, computed } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { PhotoService } from '../../services/photo.service';
import { EventService } from '../../services/event.service';
import { QrCodeService } from '../../services/qr-code.service';
import { UserService } from '../../services/user.service';

import { environment } from '../../environments/environment';
import { firstValueFrom } from 'rxjs';
import { ToastService } from '../../services/toast.service';

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
  toastService = inject(ToastService);
  userService = inject(UserService);
  private router = inject(Router);
  private sanitizer = inject(DomSanitizer);
  private qrCodeService = inject(QrCodeService);

  photos = this.photoService.photos;

  // Separate signals for dashboard default and event cover
  dashboardCoverUrl = signal<string | null>(null); // User's default cover for dashboard display
  eventCoverUrl = signal<string | null>(this.eventService.event()?.coverPhotoUrl || null); // Event's actual cover

  // Dashboard cover style (for dashboard display only)
  dashboardCoverStyle = computed(() => {
    const url = this.dashboardCoverUrl();
    if (url) {
      return this.sanitizer.bypassSecurityTrustStyle(`url('${url}')`);
    }
    return null;
  });

  // Event cover style (for QR code background)
  eventCoverStyle = computed(() => {
    const url = this.eventCoverUrl();
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
    this.loadDashboardDefaultCover();
  }

  async loadDashboardDefaultCover() {
    const user = this.authService.currentUser();
    if (user && user.user_id) {
      try {
        const url = await this.userService.getDashboardCover(user.user_id);
        if (url) {
          // Ensure URL is absolute
          const absoluteUrl = url && !url.startsWith('http')
            ? `${environment.backendUrl}${url}`
            : url;
          this.dashboardCoverUrl.set(absoluteUrl);
        }
      } catch (error) {
        console.error('Error loading dashboard default cover:', error);
      }
    }
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

    // Update QR code and event cover URL from the loaded event
    if (currentEvent) {
      this.qrCodeUrl.set(currentEvent.qrCodeUrl || null);
      this.eventCoverUrl.set(currentEvent.coverPhotoUrl || null);
    }

    // Load cover photo history
    this.loadCoverHistory();
  }

  switchEvent(event: any) {
    this.eventService.setEvent(event);
    this.eventCoverUrl.set(event.coverPhotoUrl); // Update event cover
    this.qrCodeUrl.set(event.qrCodeUrl);
    this.guestUrl = this.getGuestUrl(); // Update guest URL

    // Note: Dashboard cover (dashboardCoverUrl) remains unchanged
    // It shows the user's default, not the event's cover

    this.loadCoverHistory();
  }

  private async regenerateQrCode(event: any) {
    try {
      // Append timestamp to bypass browser cache for CORS check
      const url = event.coverPhotoUrl;
      const cacheBusterUrl = url ? `${url}?t=${new Date().getTime()}` : url;

      const newQrCodeUrl = await this.qrCodeService.generatePersonalizedQrCode(
        event.id,
        event.coupleNames,
        event.theme.colors,
        cacheBusterUrl,
        null // No local file, use URL
      );
      this.qrCodeUrl.set(newQrCodeUrl);
    } catch (err) {
      console.error('Failed to regenerate QR code', err);
    }
  }

  private getSlideshowUrl(): string {
    return `${window.location.origin}/slideshow`;
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
        // Upload to library and set as user's default cover photo
        // This does NOT update the active event
        let url = await this.userService.setDefaultCoverPhoto(file);

        // Ensure URL is absolute if it's relative
        if (url && !url.startsWith('http')) {
          url = `${environment.backendUrl}${url}`;
        }

        this.dashboardCoverUrl.set(url); // Update dashboard default only
        this.toastService.success('Dashboard cover photo updated!');

        // NOTE: This intentionally does NOT update the active event's cover photo
        // Events maintain their own cover photos for QR code persistence
        // The QR code background shows eventCoverUrl, not dashboardCoverUrl

      } catch (error: any) {
        console.error('Failed to upload cover photo', error);
        this.toastService.error(error.message || 'Failed to upload cover photo. Please try again.');
      }
    }
  }

  coverHistory = signal<any[]>([]);

  async loadCoverHistory() {
    const user = this.authService.currentUser();
    if (user && user.user_id) {
      const history = await this.eventService.getCoverPhotoHistory(user.user_id);
      this.coverHistory.set(history);
    }
  }

  async selectCoverPhoto(url: string) {
    this.dashboardCoverUrl.set(url); // Update dashboard default only
    this.toastService.success('Dashboard cover photo updated!');

    // Update user's default preference
    const user = this.authService.currentUser();
    if (user && user.user_id) {
      try {
        // Set this as the user's default cover photo
        await this.userService.setDefaultCoverFromUrl(url);
      } catch (error) {
        console.error('Error updating default cover:', error);
        this.toastService.error('Failed to set as default');
      }
    }

    // NOTE: This does NOT update the active event's cover photo
    // Events maintain their own cover photos for QR code persistence
  }

  printQrCode(): void {
    window.print();
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/']);
  }

  navigateToCreateEvent(): void {
    // STATE ISOLATION: Clear active event to ensure clean slate
    // This prevents the event creator from accidentally reusing the currently viewed event's ID
    this.eventService.clearEvent();
    this.router.navigate(['/create-event']);
  }

  navigateToSlideshow(): void {
    this.router.navigate(['/slideshow']);
  }

  navigateToBookEditor(): void {
    this.router.navigate(['/book-editor']);
  }


}
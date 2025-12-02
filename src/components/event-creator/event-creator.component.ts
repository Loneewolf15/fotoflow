import { ChangeDetectionStrategy, Component, signal, inject, computed } from '@angular/core';
import { DomSanitizer, SafeStyle } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { WeddingEvent, Theme } from '../../models/event.model';
import { EventService } from '../../services/event.service';
import { UserService } from '../../services/user.service';
import { AuthService } from '../../services/auth.service';
import QRCode from 'qrcode';
import { ToastService } from '../../services/toast.service';
import { QrCodeService } from '../../services/qr-code.service';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-event-creator',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './event-creator.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EventCreatorComponent {
  private eventService = inject(EventService);
  private router = inject(Router);
  private toastService = inject(ToastService);
  private sanitizer = inject(DomSanitizer);
  private qrCodeService = inject(QrCodeService);
  private userService = inject(UserService);
  private authService = inject(AuthService);

  coupleNames = signal('');
  eventDate = signal('');
  startTime = signal('');
  endTime = signal('');
  strictMode = signal(false);
  selectedTheme = signal<'Owanbe Vibrant' | 'Royal Gold' | 'Modern Clean'>('Owanbe Vibrant');

  isCreating = signal(false);

  // State for raw user input
  themeColorInputs = signal<string[]>(['#E91E63', '#009688']); // Default Owanbe colors (Pink/Teal)
  // State for validated, canonical hex color codes
  themeColors = signal<string[]>(['#E91E63', '#009688']);
  // State for validation errors
  colorErrors = signal<(string | null)[]>(['', '']);

  qrCodeUrl = signal('');
  showQrCode = signal(false);
  createdEventData = signal<WeddingEvent | null>(null);
  qrNote = signal('Scan this code to upload your photos to our wedding album!');
  // Zone B: Local state for this event's cover photo. Initialized from Global Default.
  coverPhotoUrl = signal<string | undefined>(undefined);

  constructor() {
    // Initialize with Global Default (One-Way Data Flow)
    const user = this.authService.currentUser();
    if (user && user.user_id) {
      this.userService.getDashboardCover(user.user_id).then(url => {
        if (url) {
          console.log('Event Creator: Loaded default cover:', url);
          // Ensure URL is absolute
          const absoluteUrl = url && !url.startsWith('http')
            ? `${environment.backendUrl}${url}`
            : url;
          this.coverPhotoUrl.set(absoluteUrl);
        } else {
          console.log('Event Creator: No default cover set');
        }
      }).catch(error => {
        console.error('Event Creator: Error loading default cover:', error);
      });
    }
  }

  cardBackgroundStyle = computed(() => {
    // Prioritize local preview (blob URL) as it's instant and avoids CORS issues
    const url = this.coverPhotoPreview() || this.coverPhotoUrl();
    if (url) {
      console.log('Setting card background to:', url);
      // Bypass security for the background image URL (needed for blob: URLs)
      return this.sanitizer.bypassSecurityTrustStyle(`url('${url}')`);
    }
    return null;
  });

  hasErrors = computed(() => this.colorErrors().some(e => e !== null && e !== ''));

  themes = [
    { name: 'Owanbe Vibrant', class: 'theme-owanbe', defaultColors: ['#E91E63', '#009688'] }, // Pink & Teal
    { name: 'Royal Gold', class: 'theme-royal', defaultColors: ['#FFD700', '#FFFFFF'] },     // Gold & White
    { name: 'Modern Clean', class: 'theme-modern', defaultColors: ['#000000', '#FFFFFF'] }    // Black & White
  ] as const;

  onThemeChange(selectedValue: 'Owanbe Vibrant' | 'Royal Gold' | 'Modern Clean'): void {
    this.selectedTheme.set(selectedValue);
    const themeConfig = this.themes.find(t => t.name === selectedValue);
    if (themeConfig) {
      const defaultColors = [...themeConfig.defaultColors];
      this.themeColors.set(defaultColors);
      this.themeColorInputs.set(defaultColors);
      this.colorErrors.set(defaultColors.map(() => null));
    }
  }

  updateColorInput(index: number, value: string): void {
    this.themeColorInputs.update(current => {
      const newInputs = [...current];
      newInputs[index] = value;
      return newInputs;
    });
  }

  validateAndCommitColor(index: number): void {
    let rawColor = this.themeColorInputs()[index]?.trim();

    if (!rawColor) {
      this.colorErrors.update(errors => {
        const newErrors = [...errors];
        newErrors[index] = 'Color cannot be empty.';
        return newErrors;
      });
      return;
    }

    // Normalize: Remove spaces to handle "Lemon Green" -> "LemonGreen"
    const normalizedColor = rawColor.replace(/\s+/g, '');

    if (CSS.supports('color', normalizedColor)) {
      const hexColor = this.colorToHex(normalizedColor);
      this.themeColors.update(current => {
        const newColors = [...current];
        newColors[index] = hexColor;
        return newColors;
      });
      // Update input to normalized value or keep raw? 
      // Let's keep raw for user context but maybe update to hex if they blur?
      // For now, let's update to the hex to be clean.
      this.themeColorInputs.update(current => {
        const newInputs = [...current];
        newInputs[index] = hexColor;
        return newInputs;
      });
      this.colorErrors.update(errors => {
        const newErrors = [...errors];
        newErrors[index] = null;
        return newErrors;
      });
    } else {
      this.colorErrors.update(errors => {
        const newErrors = [...errors];
        newErrors[index] = `'${rawColor}' is not a valid color.`;
        return newErrors;
      });
    }
  }

  onColorPickerChange(index: number, event: Event): void {
    const input = event.target as HTMLInputElement;
    const color = input.value;

    this.themeColors.update(current => {
      const newColors = [...current];
      newColors[index] = color;
      return newColors;
    });
    this.themeColorInputs.update(current => {
      const newInputs = [...current];
      newInputs[index] = color;
      return newInputs;
    });
    this.colorErrors.update(errors => {
      const newErrors = [...errors];
      newErrors[index] = null;
      return newErrors;
    });
  }

  private colorToHex(color: string): string {
    const ctx = document.createElement('canvas').getContext('2d');
    if (!ctx) return '#000000';
    ctx.fillStyle = color;
    return ctx.fillStyle;
  }

  addColor(): void {
    if (this.themeColorInputs().length >= 3) return;
    const newColor = '#CCCCCC';
    this.themeColorInputs.update(current => [...current, newColor]);
    this.themeColors.update(current => [...current, newColor]);
    this.colorErrors.update(current => [...current, null]);
  }

  removeColor(index: number): void {
    if (this.themeColorInputs().length <= 1) return;
    this.themeColorInputs.update(current => current.filter((_, i) => i !== index));
    this.themeColors.update(current => current.filter((_, i) => i !== index));
    this.colorErrors.update(current => current.filter((_, i) => i !== index));
  }

  coverPhotoFile = signal<File | null>(null);
  coverPhotoPreview = signal<string | null>(null);

  onCoverPhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      console.log('EventCreator: File selected:', file.name);
      this.coverPhotoFile.set(file);
      this.coverPhotoPreview.set(URL.createObjectURL(file));
    } else {
      console.log('EventCreator: No file selected in input');
    }
  }

  async createEvent(): Promise<void> {
    this.themeColorInputs().forEach((_, index) => this.validateAndCommitColor(index));

    if (this.hasErrors()) {
      this.toastService.show('Please fix invalid colors before creating the event.', 'error');
      return;
    }

    if (!this.coupleNames() || !this.startTime() || !this.endTime()) {
      this.toastService.show('Please fill in all fields.', 'error');
      return;
    }

    if (new Date(this.endTime()) <= new Date(this.startTime())) {
      this.toastService.show('End Time must be later than Start Time.', 'error');
      return;
    }

    const themeClass = this.themes.find(t => t.name === this.selectedTheme())?.class || 'theme-modern';
    const theme: Theme = {
      style: this.selectedTheme(),
      colors: this.themeColors(),
      styleClass: themeClass,
    };

    // Derive a display date from the start time
    const startDateObj = new Date(this.startTime());
    const eventDateDisplay = startDateObj.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    const eventData: WeddingEvent = {
      coupleNames: this.coupleNames(),
      eventDate: eventDateDisplay,
      startTime: new Date(this.startTime()).toISOString(),
      endTime: new Date(this.endTime()).toISOString(),
      strictMode: this.strictMode(),
      theme: theme,
      coverPhotoUrl: this.coverPhotoUrl() || null // Use local state (Global Default or previous) as base
    };

    try {
      this.isCreating.set(true);
      // Generate event ID from couple names and date
      // Format: firstname_lastname_YYYY-MM-DD
      // Example: precious_kolapo_2024-01-15

      const startDateObj = new Date(this.startTime());
      const dateStr = startDateObj.toISOString().split('T')[0]; // YYYY-MM-DD format

      // Extract names and sanitize
      const names = this.coupleNames()
        .split(/\s*(?:and|&)\s*/i) // Split by 'and' or '&'
        .map(name => name.trim().toLowerCase().replace(/[^a-z0-9]/g, '')) // Remove special chars
        .filter(name => name.length > 0); // Remove empty strings

      // Create event ID: name1_name2_date or name1_date if only one name
      const eventId = names.length > 1
        ? `${names[0]}_${names[1]}_${dateStr}`
        : `${names[0]}_${dateStr}`;

      console.log('Generated Event ID:', eventId);

      // 2. Handle Cover Photo Upload
      // Upload the new cover photo using the freshly generated event ID
      let finalCoverUrl = this.coverPhotoUrl();

      if (this.coverPhotoFile()) {
        console.log('EventCreator: Uploading new cover photo for event:', eventId);
        // Upload cover photo for this NEW event
        finalCoverUrl = await this.eventService.uploadCoverPhoto(this.coverPhotoFile()!, eventId);
        console.log('EventCreator: Upload complete, URL:', finalCoverUrl);
      } else {
        console.log('EventCreator: No cover photo selected, using default:', finalCoverUrl);
      }

      eventData.coverPhotoUrl = finalCoverUrl || null;

      // If we still don't have a cover photo, we might want to warn or allow it.
      // For now, proceeding.

      // 3. Generate QR code with real ID and Cover Photo
      console.log('Calling generatePersonalizedQrCode...');

      // Append timestamp to bypass browser cache for CORS check if it's a URL
      const cacheBusterUrl = finalCoverUrl && !finalCoverUrl.startsWith('blob:')
        ? `${finalCoverUrl}?t=${new Date().getTime()}`
        : finalCoverUrl;

      const qrCodeUrl = await this.qrCodeService.generatePersonalizedQrCode(
        eventId,
        this.coupleNames(),
        theme.colors,
        cacheBusterUrl, // Use the final URL (uploaded or default)
        null // We handled the file upload separately
      );
      console.log('QR Code generated.');

      // 4. Create New Event in Backend
      const newEvent: WeddingEvent = {
        ...eventData,
        id: eventId,
        qrCodeUrl: qrCodeUrl,
        coverPhotoUrl: finalCoverUrl
      };

      await this.eventService.createEvent(newEvent);

      // Update local state
      this.createdEventData.set(newEvent);
      this.qrCodeUrl.set(qrCodeUrl);
      this.showQrCode.set(true);
      // Clear the local preview so the view falls back to the remote URL (now confirmed uploaded)
      this.coverPhotoPreview.set(null);
      this.toastService.show('Event created successfully!', 'success');

    } catch (err) {
      console.error(err);
      this.toastService.show('Failed to create event. Please try again.', 'error');
    } finally {
      this.isCreating.set(false);
    }
  }

  printQrCode(): void {
    window.print();
  }

  proceedToGuestView(): void {
    const event = this.createdEventData();
    if (event && event.id) {
      this.eventService.setEvent(event);
      this.router.navigate(['/event', event.id]);
    }
  }

  goBack(): void {
    this.router.navigate(['/dashboard']);
  }
}
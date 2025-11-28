import { ChangeDetectionStrategy, Component, signal, inject, computed } from '@angular/core';
import { DomSanitizer, SafeStyle } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { WeddingEvent, Theme } from '../../models/event.model';
import { EventService } from '../../services/event.service';
import QRCode from 'qrcode';
import { ToastService } from '../../services/toast.service';

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
  coverPhotoUrl = computed(() => this.eventService.event()?.coverPhotoUrl);
  
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
    const rawColor = this.themeColorInputs()[index]?.trim();

    if (!rawColor) {
        this.colorErrors.update(errors => {
            const newErrors = [...errors];
            newErrors[index] = 'Color cannot be empty.';
            return newErrors;
        });
        return;
    }

    if (CSS.supports('color', rawColor)) {
      const hexColor = this.colorToHex(rawColor);
      this.themeColors.update(current => {
        const newColors = [...current];
        newColors[index] = hexColor;
        return newColors;
      });
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
      alert('Please fix invalid colors before creating the event.');
      return;
    }
    
    if (!this.coupleNames() || !this.startTime() || !this.endTime()) {
      alert('Please fill in all fields.');
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
      coverPhotoUrl: null // Will be updated after upload
    };
    
    try {
      this.isCreating.set(true);
      console.log('EventCreator: Starting creation. CoverFile:', this.coverPhotoFile()?.name);
      // 1. Determine Event ID (Reuse existing if available, otherwise generate new)
      const existingEvent = this.eventService.event();
      let eventId = existingEvent?.id;
      
      if (!eventId) {
          const { v4: uuidv4 } = await import('uuid');
          eventId = uuidv4();
          console.log('Generated new Event ID:', eventId);
      } else {
          console.log('Reusing existing Event ID:', eventId);
      }
      
      // 2. Handle Cover Photo
      // If user selected a new file, upload it.
      // Otherwise, keep the existing URL (if any).
      let finalCoverPhotoUrl = existingEvent?.coverPhotoUrl || null;

      if (this.coverPhotoFile()) {
        console.log('New cover photo selected, uploading...');
        finalCoverPhotoUrl = await this.eventService.uploadCoverPhoto(this.coverPhotoFile()!, eventId);
        console.log('Cover photo upload finished. URL:', finalCoverPhotoUrl);
      } else if (finalCoverPhotoUrl) {
        console.log('Using existing cover photo from dashboard:', finalCoverPhotoUrl);
      } else {
        console.log('No cover photo selected or existing.');
      }

      // 3. Generate QR code with real ID and Cover Photo
      console.log('Calling generatePersonalizedQrCode...');
      const finalQrCodeUrl = await this.generatePersonalizedQrCode(eventId!, finalCoverPhotoUrl, this.coverPhotoFile());
      this.qrCodeUrl.set(finalQrCodeUrl);
      
      // 4. Create Event with all data (ID, Cover URL, QR URL) in one go
      const finalEventData: WeddingEvent = {
        ...eventData,
        id: eventId,
        coverPhotoUrl: finalCoverPhotoUrl,
        qrCodeUrl: finalQrCodeUrl
      };

      await this.eventService.createEvent(finalEventData);

      // Update local state
      this.createdEventData.set(finalEventData);
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

  private hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
  }

  private getLuminance(r: number, g: number, b: number): number {
      const a = [r, g, b].map(v => {
          v /= 255;
          return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
      });
      return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
  }

  private getContrastRatio(hex1: string, hex2: string): number {
      const rgb1 = this.hexToRgb(hex1);
      const rgb2 = this.hexToRgb(hex2);
      if (!rgb1 || !rgb2) return 1;
      const lum1 = this.getLuminance(rgb1.r, rgb1.g, rgb1.b);
      const lum2 = this.getLuminance(rgb2.r, rgb2.g, rgb2.b);
      const lighter = Math.max(lum1, lum2);
      const darker = Math.min(lum1, lum2);
      return (lighter + 0.05) / (darker + 0.05);
  }

  private loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const image = new Image();
      // Only set crossOrigin for non-blob URLs to avoid potential issues
      if (!src.startsWith('blob:')) {
        image.crossOrigin = 'anonymous'; 
      }
      image.onload = () => resolve(image);
      image.onerror = (err) => {
        console.error('Failed to load image for QR code:', src, err);
        reject(err);
      };
      image.src = src;
    });
  }

  private async generatePersonalizedQrCode(eventId: string, coverPhotoUrl: string | null, localFile?: File | null): Promise<string> {
    console.log('Generating QR code. EventId:', eventId, 'CoverUrl:', coverPhotoUrl, 'LocalFile:', localFile);
    const guestViewUrl = `${window.location.origin}/event/${eventId}`;
    let primaryColor = this.themeColors()[0] || '#000000';
    let secondaryColor = this.themeColors()[1] || '#FFFFFF';

    // const contrastRatio = this.getContrastRatio(primaryColor, secondaryColor);
    // const MIN_CONTRAST_RATIO = 4.5;

    // if (contrastRatio < MIN_CONTRAST_RATIO) {
    //     console.warn(
    //         `Chosen theme colors have a low contrast ratio of ${contrastRatio.toFixed(2)}:1. ` +
    //         `Falling back to black and white for the QR code to ensure scannability.`
    //     );
    //     // primaryColor = '#000000';
    //     // secondaryColor = '#FFFFFF';
    // }

    const baseQrCodeUrl = await QRCode.toDataURL(guestViewUrl, {
        errorCorrectionLevel: 'H', type: 'image/png', width: 256, margin: 1,
        color: { dark: primaryColor, light: '#00000000' }
    });

    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
        throw new Error('Could not get canvas context');
    }

    // 1. Fill Background with Secondary Color (White/Theme Light)
    ctx.fillStyle = secondaryColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // 2. Draw QR Code
    const image = await this.loadImage(baseQrCodeUrl);
    ctx.drawImage(image, 0, 0);

    // 3. Draw Center Initials
    const centerRectSize = canvas.width * 0.4;
    const centerPos = (canvas.width - centerRectSize) / 2;

    // Draw center background (Solid)
    ctx.fillStyle = secondaryColor;
    ctx.fillRect(centerPos, centerPos, centerRectSize, centerRectSize);

    // Draw Initials
    this.drawInitials(ctx, centerRectSize, primaryColor);
    
    return canvas.toDataURL('image/png');
  }

  private drawInitials(ctx: CanvasRenderingContext2D, centerRectSize: number, color: string): void {
    const getInitials = (names: string): string => {
        if (!names) return '';
        return names.split(/and|&/i)
            .map(name => name.trim().charAt(0).toUpperCase())
            .join(' & ');
    };
    const initials = getInitials(this.coupleNames());

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = color;
    
    let fontSize = 48;
    ctx.font = `bold ${fontSize}px 'Playfair Display', serif`;

    while (ctx.measureText(initials).width > centerRectSize * 0.9 && fontSize > 10) {
        fontSize--;
        ctx.font = `bold ${fontSize}px 'Playfair Display', serif`;
    }

    ctx.fillText(initials, 256 / 2, 256 / 2);
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
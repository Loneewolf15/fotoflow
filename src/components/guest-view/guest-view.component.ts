import { ChangeDetectionStrategy, Component, input, output, signal, inject, ViewChild, ElementRef, OnInit, effect, computed } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { Router, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { WeddingEvent } from '../../models/event.model';
import { ImageSharpnessService } from '../../services/image-sharpness.service';
import { GeminiService } from '../../services/gemini.service';
import { PhotoService } from '../../services/photo.service';
import { EventService } from '../../services/event.service';
import { AuthService } from '../../services/auth.service';
import { CountdownComponent } from './countdown.component';

type UploadState = 'idle' | 'capturing' | 'preview' | 'checking' | 'captioning' | 'uploading' | 'success' | 'validating';

@Component({
  selector: 'app-guest-view',
  standalone: true,
  imports: [CommonModule, FormsModule, CountdownComponent],
  templateUrl: './guest-view.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GuestViewComponent implements OnInit {
  // event = input.required<WeddingEvent>(); // Removed input, now fetching from service/route

  @ViewChild('videoElement') videoElement?: ElementRef<HTMLVideoElement>;

  private sharpnessService = inject(ImageSharpnessService);
  private geminiService = inject(GeminiService);
  private photoService = inject(PhotoService);
  private eventService = inject(EventService);
  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  event = this.eventService.event; // Use signal from service

  uploadState = signal<UploadState>('idle');
  selectedFile = signal<File | null>(null);
  previewUrl = signal<string | null>(null);
  blurWarning = signal(false);
  isUploading = signal(false);
  geminiCaption = signal('');
  guestNote = signal('');
  isGeneratingCaption = signal(false);
  cameraError = signal<string | null>(null);
  cameraFacingMode = signal<'user' | 'environment'>('environment');

  eventStatus = signal<'upcoming' | 'active' | 'ended'>('active');
  validationError = signal<string | null>(null);
  isLoading = signal(true);

  private sanitizer = inject(DomSanitizer);

  coverPhotoStyle = computed(() => {
    const url = this.event()?.coverPhotoUrl;
    if (url) {
      return this.sanitizer.bypassSecurityTrustStyle(`url('${url}')`);
    }
    return null;
  });

  readonly BLUR_THRESHOLD = 100;
  readonly isShareApiAvailable = !!navigator.share;

  constructor() {
    effect(() => {
      // Re-check status if event changes
      this.checkEventStatus();
    });
  }

  ngOnInit(): void {
    console.log('GuestView: Initializing...');

    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      console.log('GuestView: Route ID:', id);
      if (id) {
        this.isLoading.set(true);
        this.eventService.loadEvent(id).then(() => {
          console.log('GuestView: Event loaded:', this.event());
          this.checkEventStatus();
          this.isLoading.set(false);
        }).catch(err => {
          console.error('GuestView: Error loading event', err);
          this.isLoading.set(false);
        });
      } else {
        this.isLoading.set(false);
      }
    });

    this.checkEventStatus();
    // Poll every minute to update status
    setInterval(() => this.checkEventStatus(), 60000);
  }

  private checkEventStatus(): void {
    // Admin Override: If currentUser is logged in (Host), always active
    if (this.authService.currentUser()) {
      this.eventStatus.set('active');
      return;
    }
    this.eventStatus.set(this.eventService.getEventStatus());
  }

  onEventStarted(): void {
    this.eventStatus.set('active');
  }

  get isGeminiConfigured(): boolean {
    return this.geminiService.isConfigured();
  }

  get isHost(): boolean {
    return !!this.authService.currentUser();
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      this.handleFile(file);
    }
  }

  async handleFile(file: File): Promise<void> {
    this.selectedFile.set(file);
    this.previewUrl.set(URL.createObjectURL(file));
    this.uploadState.set('checking');
    this.validationError.set(null);

    try {
      // 1. Sharpness Check
      const sharpness = await this.sharpnessService.checkSharpness(file);
      if (sharpness < this.BLUR_THRESHOLD) {
        this.blurWarning.set(true);
      }

      // 2. AI Context Validation (Strict Mode)
      if (this.event().strictMode) {
        this.uploadState.set('validating');
        const reader = new FileReader();
        reader.readAsDataURL(file);

        await new Promise<void>((resolve, reject) => {
          reader.onload = async () => {
            try {
              const base64String = (reader.result as string).split(',')[1];
              const validation = await this.geminiService.validateImageContext(base64String);

              if (!validation.isWeddingRelated) {
                this.validationError.set(`Photo hidden: Off-topic (${validation.reason})`);
                // Don't proceed to preview
                reject('Validation failed');
              } else {
                resolve();
              }
            } catch (e) {
              console.error("Validation error", e);
              // Fail open if error, or reject? Let's allow for now to avoid blocking on API errors
              resolve();
            }
          };
          reader.onerror = reject;
        });
      }

      this.uploadState.set('preview');

    } catch (error) {
      if (error === 'Validation failed') {
        // Stay in checking/validating state or go back to idle?
        // Let's go to a specific error state or just show the error in the UI
        // For now, we'll reset to idle but keep the error visible if we add a UI element for it.
        // Actually, let's keep it in 'idle' but with the error message shown.
        this.uploadState.set('idle');
        // We need to clear the preview url if validation failed
        URL.revokeObjectURL(this.previewUrl()!);
        this.previewUrl.set(null);
        this.selectedFile.set(null);
      } else {
        console.error("Check failed:", error);
        this.uploadState.set('preview'); // Fallback
      }
    }
  }

  async startCamera(): Promise<void> {
    this.uploadState.set('capturing');
    this.cameraError.set(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: this.cameraFacingMode() } });
      if (this.videoElement) {
        this.videoElement.nativeElement.srcObject = stream;
      }
    } catch (err: any) {
      console.error("Error accessing camera: ", err);
      if (err.name === 'NotAllowedError') {
        this.cameraError.set('Camera access was denied. Please enable camera permissions in your browser settings and try again.');
      } else if (err.name === 'NotFoundError') {
        this.cameraError.set('No camera was found on your device. You can still upload a photo from your library.');
      } else {
        this.cameraError.set('Could not access the camera. Please check your device settings.');
      }
      this.uploadState.set('idle');
    }
  }

  capturePhoto(): void {
    if (!this.videoElement) return;
    const video = this.videoElement.nativeElement;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(blob => {
      if (blob) {
        const file = new File([blob], 'capture.jpg', { type: 'image/jpeg' });
        this.stopStream();
        this.handleFile(file);
      }
    }, 'image/jpeg');
  }

  private stopStream(): void {
    if (this.videoElement?.nativeElement?.srcObject) {
      const stream = this.videoElement.nativeElement.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      this.videoElement.nativeElement.srcObject = null;
    }
  }

  switchCamera(): void {
    this.stopStream();
    this.cameraFacingMode.update(mode => mode === 'environment' ? 'user' : 'environment');
    this.startCamera();
  }

  stopCamera(): void {
    this.stopStream();
    this.uploadState.set('idle');
  }

  async uploadPhoto(): Promise<void> {
    this.uploadState.set('uploading');
    this.isUploading.set(true);

    try {
      const file = this.selectedFile();
      if (file) {
        await this.photoService.addPhoto(
          file,
          this.guestNote() || this.geminiCaption() || 'No note left.'
        );
        this.uploadState.set('success');
      }
    } catch (error) {
      console.error("Upload failed", error);
      alert("Failed to upload photo. Please try again.");
      this.uploadState.set('preview'); // Go back to preview on error
    } finally {
      this.isUploading.set(false);
    }
  }

  async generateCaption(): Promise<void> {
    const file = this.selectedFile();
    if (!file || !this.isGeminiConfigured) return;
    this.isGeneratingCaption.set(true);
    this.uploadState.set('captioning');
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
      const base64String = (reader.result as string).split(',')[1];
      const caption = await this.geminiService.generateCaptionForImage(base64String);
      this.geminiCaption.set(caption);
      this.guestNote.set(caption); // Also populate the note field
      this.isGeneratingCaption.set(false);
      this.uploadState.set('preview');
    };
    reader.onerror = (error) => {
      console.error("Error reading file for caption generation:", error);
      this.isGeneratingCaption.set(false);
      this.uploadState.set('preview');
    };
  }

  resetPreview(): void {
    if (this.previewUrl()) {
      URL.revokeObjectURL(this.previewUrl()!);
    }
    this.selectedFile.set(null);
    this.previewUrl.set(null);
    this.blurWarning.set(false);
    this.geminiCaption.set('');
    this.guestNote.set('');
    this.uploadState.set('idle');
    this.validationError.set(null);
  }

  uploadAnother(): void {
    this.resetPreview();
  }

  async shareToSocials(): Promise<void> {
    if (!this.isShareApiAvailable) {
      alert('Sharing is not supported on this browser.');
      return;
    }

    try {
      await navigator.share({
        title: `Photos from ${this.event().coupleNames}'s Wedding!`,
        text: `Join the fun and add your photos to ${this.event().coupleNames}'s wedding album!`,
        url: window.location.origin,
      });
    } catch (error) {
      console.error('Error sharing link:', error);
    }
  }

  resetApp(): void {
    // If user is a host (logged in), navigate to dashboard
    // Otherwise, navigate to landing page
    if (this.isHost) {
      this.router.navigate(['/dashboard']);
    } else {
      this.router.navigate(['/']);
    }
  }
}
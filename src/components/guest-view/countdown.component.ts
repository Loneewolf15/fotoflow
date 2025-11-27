import { Component, Input, signal, OnInit, OnDestroy, inject, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { WeddingEvent } from '../../models/event.model';

@Component({
  selector: 'app-countdown',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="fixed inset-0 w-full h-full overflow-hidden z-50">
      <!-- Layer 1: Background Image -->
      <div class="absolute inset-0 bg-cover bg-center transition-opacity duration-700"
           [style.background-image]="'url(' + (event.coverPhotoUrl || '/assets/default-wedding-bg.jpg') + ')'">
      </div>

      <!-- Layer 2: Overlay -->
      <div class="absolute inset-0 bg-black/50 backdrop-blur-sm"></div>

      <!-- Layer 3: Content -->
      <div class="relative z-10 flex flex-col items-center justify-center h-full text-white p-4 animate-fade-in">
        
        <!-- Header -->
        <p class="text-sm sm:text-base uppercase tracking-[0.2em] mb-4 opacity-90 font-light">
          Welcome to the wedding of
        </p>

        <!-- Names -->
        <h1 class="text-5xl sm:text-7xl md:text-8xl font-serif text-center mb-12 leading-tight drop-shadow-lg">
          {{ event.coupleNames }}
        </h1>

        <!-- Timer -->
        <div class="grid grid-cols-4 gap-3 sm:gap-6 mb-16">
          @for (unit of timeUnits; track unit.label) {
            <div class="flex flex-col items-center p-3 sm:p-6 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 shadow-xl min-w-[70px] sm:min-w-[100px]">
              <span class="text-3xl sm:text-5xl font-bold font-mono mb-1 sm:mb-2 drop-shadow-md">
                {{ unit.value | number:'2.0-0' }}
              </span>
              <span class="text-[10px] sm:text-xs uppercase tracking-wider opacity-80">{{ unit.label }}</span>
            </div>
          }
        </div>

        <!-- Admin Bypass -->
        @if (isAdmin()) {
          <button (click)="bypassCountdown()" 
                  class="mt-8 px-6 py-2 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-md border border-white/30 text-sm font-medium transition-all hover:scale-105">
            Test Camera (Admin Only)
          </button>
        }
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }
  `]
})
export class CountdownComponent implements OnInit, OnDestroy {
  @Input({ required: true }) event!: WeddingEvent;
  // @Input({ required: true }) targetDate!: string; // Replaced by event object
  
  timeLeft = signal({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  isAdmin = signal(false);
  
  private authService = inject(AuthService);
  private intervalId: any;

  // Helper for template loop
  get timeUnits() {
    const t = this.timeLeft();
    return [
      { label: 'Days', value: t.days },
      { label: 'Hours', value: t.hours },
      { label: 'Mins', value: t.minutes },
      { label: 'Secs', value: t.seconds }
    ];
  }

  ngOnInit() {
    this.isAdmin.set(!!this.authService.currentUser());
    this.updateTime();
    this.intervalId = setInterval(() => this.updateTime(), 1000);
  }

  ngOnDestroy() {
    if (this.intervalId) clearInterval(this.intervalId);
  }

  bypassCountdown() {
    // Force expire the countdown locally to trigger view change
    // Since the parent controls the view based on 'eventStatus', we might need to 
    // communicate this bypass differently. 
    // However, the prompt says "trigger a callback onEventStart()".
    // But in our architecture, GuestView checks status via EventService.
    // For now, let's just emit an event or hack the local state if possible.
    // Actually, looking at GuestView, it renders <app-countdown> if status is 'upcoming'.
    // We need to tell GuestView to switch to 'active'.
    // Since we don't have an output for that yet, let's add one.
    this.eventStarted.emit();
  }

  eventStarted = output<void>();

  private updateTime() {
    const now = new Date().getTime();
    const target = new Date(this.event.startTime!).getTime();
    const distance = target - now;

    if (distance < 0) {
      this.timeLeft.set({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      this.eventStarted.emit();
      return;
    }

    this.timeLeft.set({
      days: Math.floor(distance / (1000 * 60 * 60 * 24)),
      hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
      minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
      seconds: Math.floor((distance % (1000 * 60)) / 1000)
    });
  }
}

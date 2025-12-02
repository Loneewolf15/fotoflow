import { Component, Input, signal, OnInit, OnDestroy, output, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

// --- Local Interface Definition to fix missing import error ---
export interface WeddingEvent {
  id?: string;
  coupleNames?: string;
  eventDate?: string | Date; // Display date
  startTime?: string; // ISO string for countdown target
  coverPhotoUrl?: string;
  // Add other fields if necessary
}

@Component({
  selector: 'app-countdown',
  standalone: true,
  imports: [CommonModule],
  template: `
    <!-- Timer Card Only - Header is rendered by parent GuestViewComponent -->
    <div class="w-full max-w-md mx-auto bg-organic-mist/30 backdrop-blur-md rounded-2xl p-6 border border-organic-mist-light shadow-xl animate-fade-in">
        
        <div class="text-center mb-6">
            <h2 class="text-2xl sm:text-3xl font-semibold text-organic-text mb-2">Counting Down</h2>
            <p class="text-organic-stone">Until we celebrate together</p>
        </div>

        <!-- Timer Section -->
        <div class="w-full animate-scale-in">
            <div class="grid grid-cols-4 gap-3 sm:gap-4">
              @for (unit of timeUnits; track unit.label) {
                <div class="flex flex-col items-center justify-center p-3 rounded-xl border border-organic-mist-light bg-organic-mist/50 min-h-[80px] sm:min-h-[100px]">
                  <span class="text-2xl sm:text-4xl font-bold font-mono text-organic-text mb-1 drop-shadow-lg tabular-nums leading-none">
                    {{ unit.value | number:'2.0-0' }}
                  </span>
                  <span class="text-[10px] sm:text-xs uppercase tracking-wider text-organic-stone font-medium">{{ unit.label }}</span>
                </div>
              }
            </div>
        </div>

        <!-- Admin Bypass -->
        @if (isAdmin()) {
          <div class="mt-6 opacity-0 hover:opacity-100 transition-opacity duration-300">
              <button (click)="bypassCountdown()" 
                      class="px-6 py-2 rounded-full bg-organic-mist/30 hover:bg-organic-mist-light border border-organic-mist-light text-xs font-medium transition-all text-organic-text">
                Test Camera (Admin)
              </button>
          </div>
        }
    </div>
  `,
  styles: [`
    :host { display: block; }
    
    .animate-ken-burns {
      animation: kenBurns 20s infinite alternate ease-in-out;
    }
    @keyframes kenBurns {
      0% { transform: scale(1) translate(0, 0); }
      100% { transform: scale(1.15) translate(-2%, -2%); }
    }

    .animate-fade-in { animation: fade-in 1.2s ease-out forwards; }
    .animate-fade-in-delayed { animation: fade-in 1.2s ease-out 1.5s forwards; opacity: 0; }
    
    @keyframes fade-in {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
    }
    @keyframes slide-down {
        from { opacity: 0; transform: translateY(-40px); }
        to { opacity: 1; transform: translateY(0); }
    }
    .animate-slide-down { animation: slide-down 1s cubic-bezier(0.2, 0.8, 0.2, 1) forwards; }
    
    @keyframes scale-in {
        from { opacity: 0; transform: scale(0.9); }
        to { opacity: 1; transform: scale(1); }
    }
    .animate-scale-in { animation: scale-in 1s cubic-bezier(0.2, 0.8, 0.2, 1) 0.5s forwards; opacity: 0; }
  `]
})
export class CountdownComponent implements OnInit, OnDestroy {
  @Input({ required: true }) event!: WeddingEvent;
  @Input() extraImages: string[] = [];
  @Input() isUserAdmin: boolean = false;

  timeLeft = signal({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  isAdmin = signal(false);
  currentImageIndex = signal(0);

  images = computed(() => {
    const defaultBg = '/assets/default-wedding-bg.jpg';
    const cover = this.event?.coverPhotoUrl || defaultBg;

    const list = [cover];
    if (this.extraImages && this.extraImages.length > 0) {
      return [...list, ...this.extraImages];
    }
    return list;
  });

  private timerInterval: any;
  private slideInterval: any;

  eventStarted = output<void>();

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
    this.isAdmin.set(this.isUserAdmin);
    this.updateTime();

    this.timerInterval = setInterval(() => this.updateTime(), 1000);

    if (this.images().length > 1) {
      this.slideInterval = setInterval(() => {
        this.currentImageIndex.update(i => (i + 1) % this.images().length);
      }, 6000);
    }
  }

  ngOnDestroy() {
    if (this.timerInterval) clearInterval(this.timerInterval);
    if (this.slideInterval) clearInterval(this.slideInterval);
  }

  bypassCountdown() {
    this.eventStarted.emit();
  }

  private updateTime() {
    if (!this.event?.startTime) return;

    const now = new Date().getTime();
    const target = new Date(this.event.startTime).getTime();
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
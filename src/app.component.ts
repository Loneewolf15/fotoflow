import { ChangeDetectionStrategy, Component, effect, inject, Renderer2, ElementRef, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, Router } from '@angular/router';
import { EventService } from './services/event.service';
import { AuthService } from './services/auth.service';

import { ToastComponent } from './components/toast/toast.component';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterOutlet, ToastComponent],
})
export class AppComponent {
  private eventService = inject(EventService);
  private authService = inject(AuthService);
  private renderer = inject(Renderer2);
  private el = inject(ElementRef);
  private cdr = inject(ChangeDetectorRef);
  private router = inject(Router);

  event = this.eventService.event;

  constructor() {
    // Effect to handle dynamic theme and cover photo changes
    effect(() => {
      const currentEvent = this.event();
      const docElement = this.el.nativeElement.ownerDocument.documentElement;
      if (currentEvent && currentEvent.theme) {
        const colors = currentEvent.theme.colors;
        this.renderer.setStyle(docElement, '--primary-color-1', colors[0] || '#000000');
        this.renderer.setStyle(docElement, '--primary-color-2', colors[1] || colors[0] || '#000000');
        this.renderer.setStyle(docElement, '--primary-color-3', colors[2] || colors[1] || colors[0] || '#000000');
        
        if (currentEvent.coverPhotoUrl) {
            this.renderer.setStyle(docElement, '--cover-photo-url', `url(${currentEvent.coverPhotoUrl})`);
        }

        const body = this.el.nativeElement.ownerDocument.body;
        body.classList.remove('theme-modern', 'theme-retro', 'theme-luxury');
        body.classList.add(currentEvent.theme.styleClass);
        this.cdr.detectChanges();
      } else {
        // Reset styles when no event is active
        this.resetStyles();
      }
    });
  }

  private resetStyles(): void {
    const body = this.el.nativeElement.ownerDocument.body;
    body.classList.remove('theme-modern', 'theme-retro', 'theme-luxury');
    const docElement = this.el.nativeElement.ownerDocument.documentElement;
    this.renderer.removeStyle(docElement, '--primary-color-1');
    this.renderer.removeStyle(docElement, '--primary-color-2');
    this.renderer.removeStyle(docElement, '--primary-color-3');
    this.renderer.removeStyle(docElement, '--cover-photo-url');
  }
}

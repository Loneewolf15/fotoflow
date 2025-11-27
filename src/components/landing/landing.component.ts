import { ChangeDetectionStrategy, Component, output, signal, inject } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './landing.component.html',
  // FIX: Corrected typo from 'Change' to 'ChangeDetectionStrategy'.
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LandingComponent {
  private router = inject(Router);
  selectedDemoTheme = signal<'modern' | 'retro'>('modern');

  navigateToLogin(): void {
    this.router.navigate(['/login']);
  }
}

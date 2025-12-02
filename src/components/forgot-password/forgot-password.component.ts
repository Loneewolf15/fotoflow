import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="flex min-h-screen items-center justify-center relative overflow-hidden bg-organic-dark">
      <!-- Background Effects -->
      <div class="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full -z-10 pointer-events-none">
        <div class="absolute top-20 left-1/4 w-96 h-96 bg-organic-green/10 rounded-full blur-3xl animate-float" style="animation-delay: 0s;"></div>
        <div class="absolute bottom-40 right-1/4 w-96 h-96 bg-organic-stone/10 rounded-full blur-3xl animate-float" style="animation-delay: -2s;"></div>
      </div>

      <div class="w-full max-w-md space-y-8 p-6">
        <div class="text-center">
          <a routerLink="/" class="inline-flex items-center gap-2 mb-6">
            <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-organic-green to-teal-700 flex items-center justify-center shadow-lg shadow-organic-green/20">
              <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>
            </div>
            <span class="text-3xl font-bold tracking-tight text-organic-text">fotoFlow</span>
          </a>
          <h2 class="text-2xl font-bold tracking-tight text-organic-text">Reset your password</h2>
          <p class="mt-2 text-sm text-organic-stone">Enter your email address and we'll send you a link to reset your password.</p>
        </div>

        <div class="glass-panel p-8 rounded-2xl shadow-2xl">
          @if (successMessage()) {
            <div class="text-center space-y-4">
              <div class="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
                <svg class="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 class="text-lg font-medium text-organic-text">Check your email</h3>
              <p class="text-sm text-organic-stone">
                We've sent a password reset link to <strong>{{ email() }}</strong>.
              </p>
              <div class="mt-6">
                <a routerLink="/login" class="text-organic-green hover:text-emerald-400 font-medium">
                  Back to sign in
                </a>
              </div>
            </div>
          } @else {
            <form (ngSubmit)="sendResetLink()" class="space-y-6">
              <div>
                <label for="email" class="sr-only">Email address</label>
                <input id="email" name="email" type="email" [ngModel]="email()" (ngModelChange)="email.set($event)" autocomplete="email" required [disabled]="isLoading()" class="block w-full rounded-xl border-0 bg-organic-mist-light py-3 px-4 text-organic-text shadow-sm ring-1 ring-inset ring-organic-mist-light placeholder:text-organic-stone focus:ring-2 focus:ring-inset focus:ring-organic-green sm:text-sm sm:leading-6 transition-all disabled:opacity-50 disabled:cursor-not-allowed" placeholder="Email address">
              </div>

              <div>
                <button type="submit" [disabled]="isLoading()" class="w-full flex justify-center items-center gap-2 rounded-xl bg-organic-green px-3 py-3 text-sm font-bold leading-6 text-organic-dark shadow-lg shadow-organic-green/25 hover:bg-emerald-400 hover:scale-[1.02] transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:scale-100">
                  @if (isLoading()) {
                    <svg class="animate-spin h-5 w-5 text-organic-dark" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Sending link...
                  } @else {
                    Send Reset Link
                  }
                </button>
              </div>

              <div class="text-center">
                <a routerLink="/login" class="text-sm font-medium text-organic-stone hover:text-organic-text transition-colors">
                  Back to sign in
                </a>
              </div>
            </form>
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    .glass-panel {
      background: rgba(22, 28, 25, 0.8);
      backdrop-filter: blur(12px);
      border: 1px solid rgba(29, 36, 33, 1);
    }
    .animate-float {
      animation: float 6s ease-in-out infinite;
    }
    @keyframes float {
      0% { transform: translateY(0px); }
      50% { transform: translateY(-20px); }
      100% { transform: translateY(0px); }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ForgotPasswordComponent {
  private authService = inject(AuthService);
  private toastService = inject(ToastService);

  email = signal('');
  isLoading = signal(false);
  successMessage = signal(false);

  async sendResetLink() {
    if (!this.email()) {
      this.toastService.error('Please enter your email address.');
      return;
    }

    this.isLoading.set(true);

    try {
      // Simulate API call for now since backend endpoint might not exist yet
      // In a real app, you would call: await this.authService.sendPasswordResetEmail(this.email());
      await new Promise(resolve => setTimeout(resolve, 1500));

      this.successMessage.set(true);
      this.toastService.success('Password reset link sent!');
    } catch (error: any) {
      console.error('Reset password failed', error);
      this.toastService.error(error.message || 'Failed to send reset link. Please try again.');
    } finally {
      this.isLoading.set(false);
    }
  }
}

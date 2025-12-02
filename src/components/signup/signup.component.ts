import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './signup.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SignupComponent {
  private authService = inject(AuthService);
  private router = inject(Router);
  private toastService = inject(ToastService);

  name = signal('');
  email = signal('');
  password = signal('');
  confirmPassword = signal('');
  isLoading = signal(false);
  error = signal<string | null>(null);

  async signup(): Promise<void> {
    if (!this.name() || !this.email() || !this.password() || !this.confirmPassword()) {
      this.error.set('Please fill in all fields.');
      return;
    }

    if (this.password() !== this.confirmPassword()) {
      this.error.set('Passwords do not match.');
      return;
    }

    if (this.password().length < 6) {
      this.error.set('Password must be at least 6 characters.');
      return;
    }

    this.isLoading.set(true);
    this.error.set(null);

    try {
      await this.authService.signupWithEmail(this.email(), this.password(), this.name());
      this.toastService.success('Registration successful! Please activate your account via the email sent to you and proceed to login.', 5000);
      this.router.navigate(['/login']);
    } catch (err: any) {
      console.error('Signup failed', err);
      if (err.code === 'auth/email-already-in-use') {
        this.error.set('Email is already in use.');
      } else {
        this.error.set('Signup failed. Please try again.');
      }
    } finally {
      this.isLoading.set(false);
    }
  }

  async signupWithGoogle(): Promise<void> {
    try {
      await this.authService.loginWithGoogle(); // Google login handles signup automatically
      this.router.navigate(['/dashboard']);
    } catch (error) {
      console.error('Google signup failed', error);
      this.error.set('Google signup failed. Please try again.');
    }
  }

  goToLogin(): void {
    this.router.navigate(['/login']);
  }
}

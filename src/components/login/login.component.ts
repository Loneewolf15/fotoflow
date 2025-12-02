import { ChangeDetectionStrategy, Component, output, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './login.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginComponent {
  loginSuccess = output<void>();

  private authService = inject(AuthService);
  private router = inject(Router);
  private toastService = inject(ToastService);

  email = '';
  password = '';
  isLoading = false;

  async loginWithGoogle(): Promise<void> {
    this.isLoading = true;
    try {
      await this.authService.loginWithGoogle();
      this.router.navigate(['/dashboard']);
    } catch (error: any) {
      console.error('Login failed', error);
      this.toastService.error(error.message || 'Login failed. Please try again.');
    } finally {
      this.isLoading = false;
    }
  }

  async login(): Promise<void> {
    if (this.email && this.password) {
      this.isLoading = true;
      try {
        await this.authService.loginWithEmail(this.email, this.password);
        this.toastService.success('Welcome back!');
        this.router.navigate(['/dashboard']);
      } catch (error: any) {
        console.error('Login failed', error);
        if (error.message.includes('Email not confirmed')) {
          this.toastService.error('Please confirm your email address before logging in.');
        } else if (error.message.includes('Invalid login credentials')) {
          this.toastService.error('Invalid email or password.');
        } else {
          this.toastService.error(error.message || 'Login failed. Please check your credentials.');
        }
      } finally {
        this.isLoading = false;
      }
    }
  }

  goToSignup(): void {
    this.router.navigate(['/signup']);
  }
}

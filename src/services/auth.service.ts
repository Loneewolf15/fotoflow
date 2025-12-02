import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { environment } from '../environments/environment';
import { firstValueFrom } from 'rxjs';

export interface User {
  user_id: string;
  email: string;
  full_name: string;
  user_type: string;
  activation: number;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);

  private _user = signal<User | null>(this.loadUserFromStorage());
  public readonly currentUser = computed(() => this._user());

  constructor() {
    this.checkSessionTimeout();
    this.setupActivityListeners();
  }

  private loadUserFromStorage(): User | null {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  }

  private setupActivityListeners(): void {
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    events.forEach(event => {
      window.addEventListener(event, () => this.updateLastActivity());
    });
  }

  private updateLastActivity(): void {
    localStorage.setItem('lastActivity', Date.now().toString());
  }

  private checkSessionTimeout(): void {
    const lastActivity = localStorage.getItem('lastActivity');
    if (lastActivity) {
      const now = Date.now();
      const diff = now - parseInt(lastActivity, 10);
      const twentyFourHours = 24 * 60 * 60 * 1000;

      if (diff > twentyFourHours) {
        console.log('Session timed out due to inactivity.');
        this.logout();
      }
    } else {
      this.updateLastActivity();
    }
  }

  async loginWithGoogle(): Promise<void> {
    // TODO: Implement Google Login with PHP backend if needed
    throw new Error('Google Login not yet implemented for PHP backend');
  }

  async loginWithEmail(email: string, password: string): Promise<void> {
    try {
      const response = await firstValueFrom(this.http.post<{ status: string, user_data: User, access_token: string, message: string }>(
        `${environment.backendUrl}/users/loginfunc`,
        { email, password }
      ));

      if (response.status === 'true') {
        this.setSession(response.user_data, response.access_token);
      } else {
        throw new Error(response.message);
      }
    } catch (error: any) {
      throw new Error(error.error?.message || error.message || 'Login failed');
    }
  }

  async signupWithEmail(email: string, password: string, name: string): Promise<void> {
    try {
      const response = await firstValueFrom(this.http.post<{ status: boolean, message: string, user_id: string, data?: User }>(
        `${environment.backendUrl}/users/registerUser`,
        { email, password, full_name: name, confirm_password: password, phone: '0000000000' } // Default phone for now
      ));

      if (!response.status) {
        throw new Error(response.message);
      }

      if (response.data) {
        // Auto login if data is returned
        // But we need token, which register might not return unless we change it.
        // The provided controller calls loginRegisteredUser which returns user row but not token directly in response unless we modify it.
        // Actually the controller prints json_encode($response) where $response has 'data' => $log.
        // $log is the user row. It doesn't seem to return the token in the register response 'data'.
        // So let's just redirect to login.
        // Wait, the controller code for register:
        // $log = $this->loginRegisteredUser($loginData);
        // if ($log) { ... 'data' => $log ... }
        // loginRegisteredUser calls createUserSession($row) which generates token and updates DB.
        // But it returns $row (user object), not the token.
        // So we should probably just redirect to login.
      }

    } catch (error: any) {
      throw new Error(error.error?.message || error.message || 'Signup failed');
    }
  }

  async logout(): Promise<void> {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    localStorage.removeItem('lastActivity');
    this._user.set(null);
    this.router.navigate(['/login']);
  }

  private setSession(user: User, token: string) {
    localStorage.setItem('user', JSON.stringify(user));
    localStorage.setItem('token', token);
    this._user.set(user);
    this.updateLastActivity();
  }
}

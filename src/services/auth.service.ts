import { Injectable, inject, signal, computed } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { User } from '@supabase/supabase-js';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private supabase = inject(SupabaseService).supabase;
  private router = inject(Router);
  
  private _user = signal<User | null>(null);
  public readonly currentUser = computed(() => {
    const u = this._user();
    if (!u) return null;
    return {
      name: u.user_metadata['full_name'] || u.user_metadata['name'] || u.email?.split('@')[0] || 'Host',
      email: u.email || '',
      uid: u.id,
      photoURL: u.user_metadata['avatar_url']
    };
  });

  constructor() {
    // Initialize user
    this.supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
          this.checkSessionTimeout();
      }
      this._user.set(user);
    });

    // Listen for auth changes
    this.supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          this.updateLastActivity();
      }
      this._user.set(session?.user ?? null);
    });

    // Setup activity listeners
    this.setupActivityListeners();
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
          // First time or cleared, set it
          this.updateLastActivity();
      }
  }

  async loginWithGoogle(): Promise<void> {
    const { error } = await this.supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/dashboard`
      }
    });
    if (error) throw error;
  }

  async loginWithEmail(email: string, password: string): Promise<void> {
    const { error } = await this.supabase.auth.signInWithPassword({
      email,
      password
    });
    if (error) throw error;
  }

  async signupWithEmail(email: string, password: string, name: string): Promise<void> {
    const { error } = await this.supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name,
          role: 'host'
        }
      }
    });
    if (error) throw error;
  }

  async logout(): Promise<void> {
    await this.supabase.auth.signOut();
    this.router.navigate(['/login']);
  }
}

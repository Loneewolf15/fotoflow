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
      this._user.set(user);
    });

    // Listen for auth changes
    this.supabase.auth.onAuthStateChange((_, session) => {
      this._user.set(session?.user ?? null);
    });
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

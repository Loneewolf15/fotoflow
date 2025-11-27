import { Routes } from '@angular/router';
import { LandingComponent } from './components/landing/landing.component';
import { LoginComponent } from './components/login/login.component';
import { HostDashboardComponent } from './components/host-dashboard/host-dashboard.component';
import { EventCreatorComponent } from './components/event-creator/event-creator.component';
import { GuestViewComponent } from './components/guest-view/guest-view.component';
import { SlideshowComponent } from './components/slideshow/slideshow.component';
import { inject } from '@angular/core';
import { AuthService } from './services/auth.service';
import { Router } from '@angular/router';
import { toObservable } from '@angular/core/rxjs-interop';
import { map, take, filter } from 'rxjs/operators';

const authGuard = () => {
  const authService = inject(AuthService);
  const router = inject(Router);
  
  // We need to wait for the auth state to be determined (it might be null initially while loading)
  // But for now, let's just check the current value. 
  // Ideally AuthService exposes an observable or we use an effect.
  // Since we are using signals, we can convert to observable.
  
  return toObservable(authService.currentUser).pipe(
    filter(user => user !== undefined), // Wait if undefined (if we had a loading state) - here we just assume null is not logged in
    take(1),
    map(user => {
      if (user) return true;
      return router.parseUrl('/login');
    })
  );
};

export const routes: Routes = [
  { path: '', component: LandingComponent },
  { path: 'login', component: LoginComponent },
  { 
    path: 'signup', 
    loadComponent: () => import('./components/signup/signup.component').then(m => m.SignupComponent) 
  },
  { 
    path: 'dashboard', 
    component: HostDashboardComponent,
    canActivate: [authGuard] 
  },
  { 
    path: 'create-event', 
    component: EventCreatorComponent,
    canActivate: [authGuard]
  },
  { path: 'event/:id', component: GuestViewComponent },
  { path: 'slideshow', component: SlideshowComponent },
  { 
    path: 'book-editor', 
    loadComponent: () => import('./components/book-editor/book-editor.component').then(m => m.BookEditorComponent),
    canActivate: [authGuard]
  },
  { path: '**', redirectTo: '' }
];

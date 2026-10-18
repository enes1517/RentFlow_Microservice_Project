import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';
import { rootRedirectGuard } from './core/guards/root-redirect.guard';

export const routes: Routes = [
  // Ana sayfa — Rol'e göre yönlendir
  {
    path: '',
    pathMatch: 'full',
    canActivate: [rootRedirectGuard],
    children: [],
  },

  // Auth
  {
    path: 'auth',
    loadChildren: () => import('./features/auth/auth.routes').then(r => r.AUTH_ROUTES),
  },

  // Onboarding (Davetiye linki)
  {
    path: 'onboarding',
    loadComponent: () => import('./features/auth/onboarding/onboarding.component').then(c => c.OnboardingComponent)
  },

  // Kiracı portalı
  {
    path: 'tenant',
    canActivate: [authGuard, roleGuard('ROLE_TENANT')],
    loadChildren: () => import('./features/tenant/tenant.routes').then(r => r.TENANT_ROUTES),
  },

  // Ev sahibi portalı
  {
    path: 'landlord',
    canActivate: [authGuard, roleGuard('ROLE_LANDLORD')],
    loadChildren: () => import('./features/landlord/landlord.routes').then(r => r.LANDLORD_ROUTES),
  },

  // Admin portalı
  {
    path: 'admin',
    canActivate: [authGuard, roleGuard('ROLE_ADMIN')],
    loadChildren: () => import('./features/admin/admin.routes').then(r => r.ADMIN_ROUTES),
  },

  // 404
  {
    path: '**',
    loadComponent: () => import('./shared/components/not-found/not-found.component')
      .then(c => c.NotFoundComponent),
  },
];

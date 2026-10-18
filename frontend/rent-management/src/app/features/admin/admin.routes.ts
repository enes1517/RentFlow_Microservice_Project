import { Routes } from '@angular/router';
import { AdminShellComponent } from './admin-shell/admin-shell.component';

export const ADMIN_ROUTES: Routes = [
  {
    path: '',
    component: AdminShellComponent,
    children: [
      {
        path: 'dashboard',
        loadComponent: () => import('./dashboard/admin-dashboard/admin-dashboard.component').then(c => c.AdminDashboardComponent)
      },
      {
        path: 'saga-monitor',
        loadComponent: () => import('./saga-monitor/saga-monitor/saga-monitor.component').then(c => c.SagaMonitorComponent)
      },
      {
        path: 'users',
        loadComponent: () => import('./users/users/users.component').then(c => c.UsersComponent)
      },
      {
        path: 'observability',
        loadComponent: () => import('./observability/observability.component').then(c => c.ObservabilityComponent)
      },
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      }
    ]
  }
];

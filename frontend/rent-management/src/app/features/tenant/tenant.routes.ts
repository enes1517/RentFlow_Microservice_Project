import { Routes } from '@angular/router';

export const TENANT_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./tenant-shell/tenant-shell.component').then(c => c.TenantShellComponent),
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () => import('./dashboard/tenant-dashboard.component').then(c => c.TenantDashboardComponent),
      },
      {
        path: 'payment',
        loadComponent: () => import('./payment/rent-payment.component').then(c => c.RentPaymentComponent),
      },
      {
        path: 'payment-history',
        loadComponent: () => import('./payment-history/payment-history.component').then(c => c.PaymentHistoryComponent),
      },
      {
        path: 'maintenance',
        loadComponent: () => import('./maintenance/maintenance.component').then(c => c.MaintenanceComponent),
      },
    ],
  },
];

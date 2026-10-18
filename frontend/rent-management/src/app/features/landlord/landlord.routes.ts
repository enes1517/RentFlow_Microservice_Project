import { Routes } from '@angular/router';
import { LandlordShellComponent } from './landlord-shell/landlord-shell.component';

export const LANDLORD_ROUTES: Routes = [
  {
    path: '',
    component: LandlordShellComponent,
    children: [
      {
        path: 'dashboard',
        loadComponent: () => import('./dashboard/landlord-dashboard/landlord-dashboard.component').then(c => c.LandlordDashboardComponent)
      },
      {
        path: 'properties',
        loadComponent: () => import('./properties/properties/properties.component').then(c => c.PropertiesComponent)
      },
      {
        path: 'tenants',
        loadComponent: () => import('./tenants/tenants/tenants.component').then(c => c.TenantsComponent)
      },
      {
        path: 'leases',
        loadComponent: () => import('./leases/leases/leases.component').then(c => c.LeasesComponent)
      },
      {
        path: 'maintenance',
        loadComponent: () => import('./maintenance/maintenance.component').then(c => c.LandlordMaintenanceComponent)
      },
      {
        path: 'income-report',
        loadComponent: () => import('./income-report/income-report/income-report.component').then(c => c.IncomeReportComponent)
      },
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      }
    ]
  }
];

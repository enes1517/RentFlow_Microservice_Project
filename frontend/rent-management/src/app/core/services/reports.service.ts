import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { HttpErrorResponse } from '@angular/common/http';
import { catchError, forkJoin, map, Observable, of, switchMap, throwError } from 'rxjs';
import { LeaseService } from './lease.service';
import { MaintenanceRequest, MaintenanceService } from './maintenance.service';
import { PaymentRecord, PaymentService } from './payment.service';
import { PropertyService } from './property.service';

export interface MonthlyIncomeReport {
  month: number;
  receivedIncome: number;
  estimatedMaintenanceCosts: number;
  netAfterEstimatedMaintenance: number;
  paymentCount: number;
}

export interface IncomeReport {
  landlordId: string;
  year: number;
  currency: string;
  totalReceivedIncome: number;
  totalEstimatedMaintenanceCosts: number;
  netAfterEstimatedMaintenance: number;
  lateFeesTracked: boolean;
  months: MonthlyIncomeReport[];
}

@Injectable({ providedIn: 'root' })
export class ReportsService {
  private readonly apiUrl = '/api/reports';

  constructor(
    private readonly http: HttpClient,
    private readonly leaseService: LeaseService,
    private readonly maintenanceService: MaintenanceService,
    private readonly paymentService: PaymentService,
    private readonly propertyService: PropertyService
  ) {}

  getIncomeReport(landlordId: string, year: number): Observable<IncomeReport> {
    return this.http.get<IncomeReport>(
      `${this.apiUrl}/income/${encodeURIComponent(landlordId)}`,
      { params: { year } }
    );
  }
}



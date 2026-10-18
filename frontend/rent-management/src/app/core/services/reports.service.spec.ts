import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { LeaseService } from './lease.service';
import { MaintenanceService } from './maintenance.service';
import { PaymentService } from './payment.service';
import { PropertyService } from './property.service';
import { IncomeReport, ReportsService } from './reports.service';
import { firstValueFrom } from 'rxjs';

describe('ReportsService', () => {
  let service: ReportsService;
  let http: HttpTestingController;

  const mockReport: IncomeReport = {
    landlordId: 'landlord-1',
    year: 2026,
    currency: 'TRY',
    totalReceivedIncome: 12000,
    totalEstimatedMaintenanceCosts: 1500,
    netAfterEstimatedMaintenance: 10500,
    lateFeesTracked: false,
    months: Array.from({ length: 12 }, (_, index) => ({
      month: index + 1,
      receivedIncome: index === 0 ? 12000 : 0,
      estimatedMaintenanceCosts: index === 0 ? 1500 : 0,
      netAfterEstimatedMaintenance: index === 0 ? 10500 : 0,
      paymentCount: index === 0 ? 1 : 0
    }))
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: LeaseService, useValue: {} },
        { provide: PropertyService, useValue: {} },
        { provide: PaymentService, useValue: {} },
        { provide: MaintenanceService, useValue: {} }
      ]
    });
    service = TestBed.inject(ReportsService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('fetches income report for given landlord and year from the API', async () => {
    const resultPromise = firstValueFrom(service.getIncomeReport('landlord-1', 2026));

    const req = http.expectOne(request =>
      request.url === '/api/reports/income/landlord-1' &&
      request.params.get('year') === '2026'
    );
    expect(req.request.method).toBe('GET');
    req.flush(mockReport);

    const report = await resultPromise;
    expect(report.landlordId).toBe('landlord-1');
    expect(report.year).toBe(2026);
    expect(report.totalReceivedIncome).toBe(12000);
    expect(report.totalEstimatedMaintenanceCosts).toBe(1500);
    expect(report.netAfterEstimatedMaintenance).toBe(10500);
    expect(report.months).toHaveLength(12);
  });
});

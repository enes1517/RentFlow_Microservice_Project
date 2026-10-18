import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Store } from '@ngrx/store';
import { Observable, of, throwError } from 'rxjs';
import { ReportsService } from '../../../../core/services/reports.service';
import { IncomeReportComponent } from './income-report.component';

describe('IncomeReportComponent', () => {
  let fixture: ComponentFixture<IncomeReportComponent>;

  const report = {
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

  async function createFixture(response: Observable<typeof report>) {
    const reportService = { getIncomeReport: vi.fn().mockReturnValue(response) };
    await TestBed.configureTestingModule({
      imports: [IncomeReportComponent],
      providers: [
        { provide: Store, useValue: { select: vi.fn(() => of('landlord-1')) } },
        { provide: ReportsService, useValue: reportService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(IncomeReportComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return reportService;
  }

  it('loads real report data for the authenticated landlord and selected year', async () => {
    const reportService = await createFixture(of(report));
    const element = fixture.nativeElement as HTMLElement;

    expect(reportService.getIncomeReport).toHaveBeenCalledWith('landlord-1', new Date().getFullYear());
    expect(element.textContent).toContain('Gerçekleşen tahsilat');
    expect(element.textContent).toContain('12,000.00 TL');
    expect(element.textContent).toContain('1,500.00 TL');
    expect(element.textContent).toContain('gecikme ücretleri sistemde takip edilmediğinden');
    expect(element.querySelectorAll('tbody tr')).toHaveLength(12);
    expect((element.querySelector('button') as HTMLButtonElement).disabled).toBe(false);
  });

  it('shows an explicit error and retry action when the report and source APIs fail', async () => {
    await createFixture(throwError(() => new Error('Unavailable')));

    const element = fixture.nativeElement as HTMLElement;
    expect(element.textContent).toContain('Gelir raporu yüklenemedi.');
    expect(element.querySelector('tbody')).toBeNull();
    expect(element.textContent).toContain('Tekrar dene');
    const retryButton = [...element.querySelectorAll('button')]
      .find(button => button.textContent?.includes('Tekrar dene'));
    expect(retryButton?.disabled).toBe(false);
  });
});

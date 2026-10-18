import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Store } from '@ngrx/store';
import { filter, take } from 'rxjs';
import { selectUserId } from '../../../../store/auth/auth.selectors';
import { IncomeReport, ReportsService } from '../../../../core/services/reports.service';

@Component({
  selector: 'app-income-report',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="page animate-slideUp">
      <div class="page__header flex justify-between items-center">
        <div>
          <h1>Finansal Gelir & Gider Raporu 📊</h1>
          <p>Gerçekleşen TL tahsilatları ve kapatılmış bakım taleplerinin maliyet tahminleri.</p>
        </div>
        <div class="report-controls">
          <label for="report-year">Mali Yıl</label>
          <input id="report-year" type="number" min="2000" max="2100" class="input input--year"
                 [value]="year" (change)="changeYear($event)" [disabled]="isLoading">
          <button class="btn btn--secondary" type="button"
                  (click)="exportCsv()" [disabled]="!report || isLoading">
            <span class="icon">📥</span> CSV indir
          </button>
        </div>
      </div>

      <p class="alert alert--danger mt-6" role="alert" *ngIf="errorMessage">{{ errorMessage }}</p>
      <button *ngIf="errorMessage" class="btn btn--secondary mt-4" type="button"
              (click)="retryReport()" [disabled]="isLoading">
        {{ isLoading ? 'Yükleniyor...' : 'Tekrar dene' }}
      </button>
      <p class="loading mt-6" role="status" *ngIf="isLoading">Gelir raporu yükleniyor...</p>

      <ng-container *ngIf="report as data">
        <div class="summary-grid mt-6">
          <section class="summary-card stat-card">
            <div class="summary-card__icon">💰</div>
            <div>
              <span>Gerçekleşen tahsilat</span>
              <strong class="currency text-emerald">{{ data.totalReceivedIncome | number:'1.2-2' }} {{ currencyLabel(data.currency) }}</strong>
            </div>
          </section>
          <section class="summary-card stat-card">
            <div class="summary-card__icon">🔧</div>
            <div>
              <span>Tahmini bakım maliyeti</span>
              <strong class="currency text-warning">{{ data.totalEstimatedMaintenanceCosts | number:'1.2-2' }} {{ currencyLabel(data.currency) }}</strong>
            </div>
          </section>
          <section class="summary-card stat-card summary-card--net">
            <div class="summary-card__icon">📈</div>
            <div>
              <span>Tahmini net gelir</span>
              <strong class="currency text-gradient">{{ data.netAfterEstimatedMaintenance | number:'1.2-2' }} {{ currencyLabel(data.currency) }}</strong>
            </div>
          </section>
        </div>
        <section class="card mt-6">
          <div class="section-header">
            <h2>{{ data.year }} aylık döküm</h2>
            <span class="badge badge--soft-emerald">12 Aylık Finansal Özet</span>
          </div>
          <p class="report-note">
            Yalnızca PAID/SUCCESS durumundaki TL kira ödemeleri tahsilat sayılır. Bakım maliyeti,
            kapatılmış taleplerde girilen tahmini tutardır; gecikme ücretleri sistemde takip edilmediğinden hesaplamaya dahil değildir.
          </p>
          <div class="table-wrap">
            <table class="table">
              <thead>
                <tr>
                  <th scope="col">Ay</th>
                  <th scope="col">Tahsilat</th>
                  <th scope="col">Ödeme adedi</th>
                  <th scope="col">Tahmini bakım</th>
                  <th scope="col">Tahmini net</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let month of data.months">
                  <th scope="row" class="month-name">{{ monthNames[month.month - 1] }}</th>
                  <td class="currency font-semibold text-white">{{ month.receivedIncome | number:'1.2-2' }} {{ currencyLabel(data.currency) }}</td>
                  <td><span class="badge" [class.badge--soft-emerald]="month.paymentCount > 0">{{ month.paymentCount }} Adet</span></td>
                  <td class="currency text-warning">{{ month.estimatedMaintenanceCosts | number:'1.2-2' }} {{ currencyLabel(data.currency) }}</td>
                  <td class="currency font-bold" [class.text-emerald]="month.netAfterEstimatedMaintenance > 0">{{ month.netAfterEstimatedMaintenance | number:'1.2-2' }} {{ currencyLabel(data.currency) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </ng-container>
    </div>
  `,
  styles: [`
    .justify-between { justify-content: space-between; }
    .report-controls { display: flex; align-items: center; gap: 12px; }
    .report-controls label { color: var(--text-secondary); font-weight: 600; font-size: 0.875rem; }
    .input--year { width: 110px !important; padding: 10px 14px; text-align: center; font-weight: 700; font-family: var(--font-mono); }
    .summary-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; }
    .summary-card { 
      display: flex; 
      flex-direction: row; 
      align-items: center;
      gap: 16px; 
      padding: 24px; 
      background: var(--gradient-card); 
      border: 1px solid var(--border-color); 
      border-radius: var(--radius-lg); 
      box-shadow: var(--shadow-md);

      &__icon {
        width: 48px;
        height: 48px;
        border-radius: var(--radius-md);
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.08);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.5rem;
        flex-shrink: 0;
      }

      span { color: #94a3b8; font-size: 0.8125rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.02em; display: block; margin-bottom: 4px; }
      strong { color: #ffffff; font-size: 1.625rem; font-weight: 800; letter-spacing: -0.02em; }
    }
    .summary-card--net { 
      border-color: rgba(99, 102, 241, 0.35); 
      background: linear-gradient(135deg, rgba(99, 102, 241, 0.12) 0%, rgba(17, 23, 38, 0.9) 100%);
    }
    .report-note { margin: 0 0 20px; color: #94a3b8; font-size: 0.875rem; line-height: 1.6; }
    .table-wrap { overflow-x: auto; border-radius: var(--radius-md); }
    .month-name { color: #ffffff; font-weight: 700; }
    .loading { color: var(--text-secondary); }
    @media (max-width: 760px) {
      .page__header { align-items: flex-start; flex-direction: column; gap: 16px; }
      .report-controls { width: 100%; flex-wrap: wrap; }
      .summary-grid { grid-template-columns: 1fr; }
    }
  `]
})
export class IncomeReportComponent {
  private readonly store = inject(Store);
  private readonly reportsService = inject(ReportsService);
  private readonly changeDetector = inject(ChangeDetectorRef);
  private landlordId: string | null = null;

  readonly monthNames = [
    'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
    'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
  ];
  year = new Date().getFullYear();
  isLoading = true;
  errorMessage = '';
  report: IncomeReport | null = null;

  currencyLabel(currency?: string): string {
    return currency === 'TRY' ? 'TL' : (currency || 'TL');
  }

  ngOnInit(): void {
    this.store.select(selectUserId).pipe(
      filter((id): id is string => Boolean(id)),
      take(1)
    ).subscribe(landlordId => {
      this.landlordId = landlordId;
      this.loadReport(landlordId);
    });
  }

  changeYear(event: Event): void {
    const year = Number((event.target as HTMLInputElement).value);
    if (!Number.isInteger(year) || year < 2000 || year > 2100) {
      this.errorMessage = 'Rapor yılı 2000 ile 2100 arasında olmalıdır.';
      return;
    }

    this.year = year;
    this.retryReport();
  }

  retryReport(): void {
    if (this.landlordId) {
      this.loadReport(this.landlordId);
      return;
    }

    this.store.select(selectUserId).pipe(take(1)).subscribe(landlordId => {
      if (!landlordId) {
        this.isLoading = false;
        this.errorMessage = 'Oturum kullanıcı bilgisi bulunamadı. Lütfen yeniden giriş yapın.';
        this.changeDetector.markForCheck();
        return;
      }
      this.landlordId = landlordId;
      this.loadReport(landlordId);
    });
  }

  exportCsv(): void {
    if (!this.report) return;

    const rows = [
      ['Ay', 'Gerçekleşen tahsilat', 'Ödeme adedi', 'Tahmini bakım maliyeti', 'Tahmini net gelir'],
      ...this.report.months.map(month => [
        this.monthNames[month.month - 1],
        month.receivedIncome.toFixed(2),
        String(month.paymentCount),
        month.estimatedMaintenanceCosts.toFixed(2),
        month.netAfterEstimatedMaintenance.toFixed(2)
      ])
    ];
    const csv = rows.map(row => row.map(value => `"${value.replace(/"/g, '""')}"`).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `rentflow-gelir-raporu-${this.report.year}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  private loadReport(landlordId: string): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.reportsService.getIncomeReport(landlordId, this.year).subscribe({
      next: report => {
        this.report = report;
        this.isLoading = false;
        this.changeDetector.markForCheck();
      },
      error: (error: unknown) => {
        this.report = null;
        this.errorMessage = error instanceof HttpErrorResponse && error.status === 503
          ? 'Gelir raporu henüz hazır değil; kaynak mülk ve ödeme verilerinin rapor projeksiyonuna aktarılması bekleniyor. İşlem tamamlandıktan sonra tekrar deneyin.'
          : 'Gelir raporu yüklenemedi. Lütfen servis durumunu kontrol edip tekrar deneyin.';
        this.isLoading = false;
        this.changeDetector.markForCheck();
      }
    });
  }
}

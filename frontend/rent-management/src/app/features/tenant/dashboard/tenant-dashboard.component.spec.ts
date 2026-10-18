import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Store } from '@ngrx/store';
import { of } from 'rxjs';
import { LeaseService } from '../../../core/services/lease.service';
import { PaymentService } from '../../../core/services/payment.service';
import { selectUserId } from '../../../store/auth/auth.selectors';
import { TenantDashboardComponent } from './tenant-dashboard.component';

describe('TenantDashboardComponent', () => {
  let fixture: ComponentFixture<TenantDashboardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TenantDashboardComponent],
      providers: [
        provideRouter([]),
        {
          provide: Store,
          useValue: {
            select: (selector: unknown) => of(selector === selectUserId ? null : 'Demo Tenant')
          }
        },
        { provide: LeaseService, useValue: { getLeasesByTenant: vi.fn() } },
        { provide: PaymentService, useValue: { getPaymentsByTenant: vi.fn() } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(TenantDashboardComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  });

  it('ends loading and explains the missing profile instead of waiting forever', () => {
    const element = fixture.nativeElement as HTMLElement;

    expect(fixture.componentInstance.isLoading).toBe(false);
    expect(element.textContent).toContain('Gösterge paneli verileri yüklenemedi.');
    expect(element.textContent).not.toContain('Gösterge paneli yükleniyor...');
  });
});

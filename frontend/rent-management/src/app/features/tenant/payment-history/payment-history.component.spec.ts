import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Store } from '@ngrx/store';
import { of } from 'rxjs';
import { PaymentService } from '../../../core/services/payment.service';
import { selectUserId } from '../../../store/auth/auth.selectors';
import { PaymentHistoryComponent } from './payment-history.component';

describe('PaymentHistoryComponent', () => {
  let fixture: ComponentFixture<PaymentHistoryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PaymentHistoryComponent],
      providers: [
        provideRouter([]),
        {
          provide: Store,
          useValue: {
            select: (selector: unknown) => of(selector === selectUserId ? null : 'Demo Tenant')
          }
        },
        { provide: PaymentService, useValue: { getPaymentsByTenant: vi.fn() } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(PaymentHistoryComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  });

  it('shows a visible error and clears loading when no user profile is available', () => {
    const element = fixture.nativeElement as HTMLElement;

    expect(fixture.componentInstance.isLoading).toBe(false);
    expect(element.textContent).toContain('Ödeme geçmişi yüklenemedi.');
    expect(element.textContent).not.toContain('Ödeme geçmişi yükleniyor...');
  });
});

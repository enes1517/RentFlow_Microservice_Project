import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { LeaseService } from '../../../../core/services/lease.service';
import { PaymentService } from '../../../../core/services/payment.service';
import { PropertyService } from '../../../../core/services/property.service';
import { UserService } from '../../../../core/services/user.service';
import { AdminDashboardComponent } from './admin-dashboard.component';

describe('AdminDashboardComponent', () => {
    let fixture: ComponentFixture<AdminDashboardComponent>;
    let component: AdminDashboardComponent;

    beforeEach(async () => {
        const now = new Date();
        await TestBed.configureTestingModule({
            imports: [AdminDashboardComponent],
            providers: [
                provideRouter([]),
                { provide: UserService, useValue: { getUsers: () => of([{ id: 'u-1' }, { id: 'u-2' }]) } },
                {
                    provide: PropertyService,
                    useValue: {
                        getAllProperties: () => of([{ units: [{}, {}] }, { units: [{}] }])
                    }
                },
                {
                    provide: LeaseService,
                    useValue: {
                        getLeases: () => of([
                            { id: 'lease-1-abcdef', status: 'ACTIVE', startDate: now.toISOString(), monthlyRentAmount: 1000 },
                            { id: 'lease-2-abcdef', status: 'CANCELLED', startDate: now.toISOString(), monthlyRentAmount: 1000 }
                        ])
                    }
                },
                {
                    provide: PaymentService,
                    useValue: {
                        getAllPayments: () => of([
                            { id: 'pay-1-abcdef', status: 'SUCCESS', currency: 'TRY', createdAt: now.toISOString(), amount: 1200 },
                            { id: 'pay-2-abcdef', status: 'SUCCESS', currency: 'USD', createdAt: now.toISOString(), amount: 100 },
                            { id: 'pay-3-abcdef', status: 'FAILED', currency: 'TRY', createdAt: now.toISOString(), amount: 500 }
                        ])
                    }
                }
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(AdminDashboardComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('shows aggregate counts and only successful TRY payments for the current month', () => {
        expect(component.userCount).toBe(2);
        expect(component.propertyCount).toBe(2);
        expect(component.unitCount).toBe(3);
        expect(component.activeLeaseCount).toBe(1);
        expect(component.currentMonthVolume).toBe(1200);
        expect(component.isLoading).toBe(false);
        expect(component.errorMessage).toBeNull();
    });
});

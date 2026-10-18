import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Store } from '@ngrx/store';
import { of } from 'rxjs';
import { LeaseService } from '../../../../core/services/lease.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { PropertyService } from '../../../../core/services/property.service';
import { UserService } from '../../../../core/services/user.service';
import { TenantsComponent } from './tenants.component';

describe('TenantsComponent', () => {
  let fixture: ComponentFixture<TenantsComponent>;
  let userService: { getTenantsByIds: ReturnType<typeof vi.fn>; getUser: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    userService = {
      getTenantsByIds: vi.fn().mockReturnValue(of([{
        id: 'tenant-1',
        firstName: 'Demo',
        lastName: 'Tenant',
        email: 'tenant@demo.com'
      }])),
      getUser: vi.fn()
    };

    await TestBed.configureTestingModule({
      imports: [TenantsComponent],
      providers: [
        { provide: Store, useValue: { select: vi.fn(() => of('landlord-1')) } },
        {
          provide: LeaseService,
          useValue: {
            getLeasesByLandlord: vi.fn(() => of([
              {
                id: 'active-lease',
                tenantId: 'tenant-1',
                landlordId: 'landlord-1',
                propertyId: 'property-1',
                unitId: 'unit-1',
                startDate: '2026-01-01',
                endDate: '2027-01-01',
                monthlyRentAmount: 24000,
                depositAmount: 24000,
                status: 'ACTIVE'
              },
              {
                id: 'pending-lease',
                tenantId: 'tenant-2',
                landlordId: 'landlord-1',
                propertyId: 'property-2',
                unitId: 'unit-2',
                startDate: '2026-01-01',
                endDate: '2027-01-01',
                monthlyRentAmount: 18000,
                depositAmount: 18000,
                status: 'PENDING'
              }
            ]))
          }
        },
        { provide: UserService, useValue: userService },
        {
          provide: PropertyService,
          useValue: {
            getProperty: vi.fn(() => of({
              id: 'property-1',
              name: 'Ornek Residence',
              street: 'Moda Caddesi 10'
            }))
          }
        },
        { provide: NotificationService, useValue: { sendNotification: vi.fn() } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(TenantsComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  });

  it('lists only tenants on active leases without requesting forbidden user profiles', () => {
    const element = fixture.nativeElement as HTMLElement;
    const rows = element.querySelectorAll('tbody tr');

    expect(userService.getTenantsByIds).toHaveBeenCalledWith(['tenant-1']);
    expect(userService.getUser).not.toHaveBeenCalled();
    expect(rows).toHaveLength(1);
    expect(rows[0].textContent).toContain('Demo Tenant');
    expect(rows[0].textContent).toContain('Ornek Residence');
  });
});

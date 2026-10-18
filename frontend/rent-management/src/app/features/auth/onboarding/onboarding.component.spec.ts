import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { of } from 'rxjs';
import { OnboardingComponent } from './onboarding.component';

describe('OnboardingComponent', () => {
  let component: OnboardingComponent;
  let fixture: ComponentFixture<OnboardingComponent>;
  let router: { navigate: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    router = { navigate: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [OnboardingComponent],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            queryParams: of({ token: 'test-invitation-token-123' })
          }
        },
        { provide: Router, useValue: router }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(OnboardingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create and capture invitation token from query params', () => {
    expect(component).toBeTruthy();
    expect(component.invitationToken).toBe('test-invitation-token-123');
  });

  it('should navigate to login with invitation token when goToRegistration is called', () => {
    component.goToRegistration();
    expect(router.navigate).toHaveBeenCalledWith(['/auth/login'], {
      queryParams: { token: 'test-invitation-token-123' }
    });
  });
});

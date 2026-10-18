import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AuthSessionService } from '../../../core/services/auth-session.service';
import { LoginComponent } from './login.component';

describe('LoginComponent', () => {
    let fixture: ComponentFixture<LoginComponent>;
    let authSession: { initialize: ReturnType<typeof vi.fn>; beginLogin: ReturnType<typeof vi.fn> };

    beforeEach(async () => {
        vi.spyOn(console, 'error').mockReturnValue(undefined);
        authSession = {
            initialize: vi.fn().mockResolvedValue(undefined),
            beginLogin: vi.fn().mockResolvedValue(undefined)
        };

        await TestBed.configureTestingModule({
            imports: [LoginComponent],
            providers: [
                { provide: AuthSessionService, useValue: authSession }
            ]
        }).compileComponents();
    });

    it('shows session initialization errors and allows the user to retry login', async () => {
        authSession.initialize.mockRejectedValueOnce(new Error('Giriş servisine ulaşılamıyor.'));
        fixture = TestBed.createComponent(LoginComponent);
        fixture.detectChanges();
        await fixture.whenStable();
        expect(fixture.componentInstance.errorMessage).toContain('Giriş servisine');

        fixture.nativeElement.querySelector('#keycloak-sso-btn').click();
        await fixture.whenStable();

        expect(authSession.initialize).toHaveBeenCalledTimes(1);
        expect(authSession.beginLogin).toHaveBeenCalledTimes(1);
        expect(fixture.componentInstance.errorMessage).toBe('');
    });
});

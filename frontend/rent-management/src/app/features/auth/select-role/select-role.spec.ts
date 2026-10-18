import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClient } from '@angular/common/http';
import { of } from 'rxjs';
import { OAuthService } from 'angular-oauth2-oidc';
import { AuthSessionService } from '../../../core/services/auth-session.service';
import { SelectRoleComponent } from './select-role.component';

describe('SelectRoleComponent', () => {
  let component: SelectRoleComponent;
  let fixture: ComponentFixture<SelectRoleComponent>;
  let httpClient: { post: ReturnType<typeof vi.fn> };
  let oauthService: { refreshToken: ReturnType<typeof vi.fn>; logOut: ReturnType<typeof vi.fn> };
  let authSession: { initialize: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    httpClient = { post: vi.fn().mockReturnValue(of({})) };
    oauthService = {
      refreshToken: vi.fn().mockResolvedValue({}),
      logOut: vi.fn()
    };
    authSession = { initialize: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [SelectRoleComponent],
      providers: [
        { provide: HttpClient, useValue: httpClient },
        { provide: OAuthService, useValue: oauthService },
        { provide: AuthSessionService, useValue: authSession }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(SelectRoleComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should call http.post on selectRole', () => {
    component.selectRole('ROLE_LANDLORD');
    expect(httpClient.post).toHaveBeenCalledWith('/api/users/select-role', { role: 'ROLE_LANDLORD' });
    expect(component.isSubmitting).toBe(true);
  });
});

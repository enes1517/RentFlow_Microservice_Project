import { TestBed } from '@angular/core/testing';
import { Store } from '@ngrx/store';
import { OAuthService } from 'angular-oauth2-oidc';
import { of } from 'rxjs';
import { loginSuccess } from '../../store/auth/auth.actions';
import { UserService } from './user.service';
import { AuthSessionService } from './auth-session.service';
import { RuntimeConfigService } from './runtime-config.service';

describe('AuthSessionService', () => {
  it('restores the user profile and application roles before protected navigation', async () => {
    const tokenPayload = btoa(JSON.stringify({
      realm_access: { roles: ['ROLE_TENANT'] }
    }));
    const oauth = {
      configure: vi.fn(),
      loadDiscoveryDocumentAndTryLogin: vi.fn().mockResolvedValue(true),
      hasValidAccessToken: vi.fn().mockReturnValue(true),
      getIdentityClaims: vi.fn().mockReturnValue({
        sub: 'keycloak-user-1',
        email: 'tenant@example.test',
        given_name: 'Demo',
        family_name: 'Tenant'
      }),
      getAccessToken: vi.fn().mockReturnValue(`header.${tokenPayload}.signature`),
      initCodeFlow: vi.fn(),
      logOut: vi.fn()
    };
    const profile = {
      id: 'application-user-1',
      status: 'UPDATED'
    };
    const syncCurrentUser = vi.fn().mockReturnValue(of(profile));
    const dispatch = vi.fn();

    TestBed.configureTestingModule({
      providers: [
        AuthSessionService,
        { provide: OAuthService, useValue: oauth },
        { provide: RuntimeConfigService, useValue: { identityIssuer: 'http://localhost:8080/realms/rent-management' } },
        { provide: UserService, useValue: { syncCurrentUser } },
        { provide: Store, useValue: { dispatch } }
      ]
    });

    const session = TestBed.inject(AuthSessionService);
    await session.initialize();

    expect(oauth.loadDiscoveryDocumentAndTryLogin).toHaveBeenCalledTimes(1);
    expect(syncCurrentUser).toHaveBeenCalledTimes(1);
    expect(dispatch).toHaveBeenCalledWith(loginSuccess({
      userId: profile.id,
      keycloakId: 'keycloak-user-1',
      email: 'tenant@example.test',
      firstName: 'Demo',
      lastName: 'Tenant',
      roles: ['ROLE_TENANT']
    }));
    expect(oauth.logOut).not.toHaveBeenCalled();
  });

  it('does not clear an unauthenticated session when starting the login flow', async () => {
    const oauth = {
      configure: vi.fn(),
      loadDiscoveryDocumentAndTryLogin: vi.fn().mockResolvedValue(false),
      hasValidAccessToken: vi.fn().mockReturnValue(false),
      initCodeFlow: vi.fn(),
      logOut: vi.fn()
    };

    TestBed.configureTestingModule({
      providers: [
        AuthSessionService,
        { provide: OAuthService, useValue: oauth },
        { provide: RuntimeConfigService, useValue: { identityIssuer: 'http://localhost:8080/realms/rent-management' } },
        { provide: UserService, useValue: { syncCurrentUser: vi.fn() } },
        { provide: Store, useValue: { dispatch: vi.fn() } }
      ]
    });

    await TestBed.inject(AuthSessionService).beginLogin();

    expect(oauth.initCodeFlow).toHaveBeenCalledTimes(1);
    expect(oauth.logOut).not.toHaveBeenCalled();
  });
});

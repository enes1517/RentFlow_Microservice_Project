import { Injectable, inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { AuthConfig, OAuthService } from 'angular-oauth2-oidc';
import { firstValueFrom } from 'rxjs';
import { UserService } from './user.service';
import { loginSuccess } from '../../store/auth/auth.actions';
import { RuntimeConfigService } from './runtime-config.service';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function readApplicationRoles(accessToken: string): string[] {
  const encodedPayload = accessToken.split('.')[1];
  if (!encodedPayload) throw new Error('Kimlik sağlayıcısının erişim tokenı geçersiz.');

  const base64 = encodedPayload.replace(/-/g, '+').replace(/_/g, '/');
  const bytes = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '='));
  const json = decodeURIComponent(Array.from(bytes, character =>
    `%${character.charCodeAt(0).toString(16).padStart(2, '0')}`).join(''));
  const decoded: unknown = JSON.parse(json);
  if (!isRecord(decoded) || !isRecord(decoded['realm_access'])) return [];

  const roles = decoded['realm_access']['roles'];
  return Array.isArray(roles)
    ? roles.filter((role): role is string => typeof role === 'string' &&
      ['ROLE_ADMIN', 'ROLE_LANDLORD', 'ROLE_TENANT', 'ROLE_USER'].includes(role))
    : [];
}

@Injectable({ providedIn: 'root' })
export class AuthSessionService {
  private readonly oauth = inject(OAuthService);
  private readonly userService = inject(UserService);
  private readonly store = inject(Store);
  private readonly runtimeConfig = inject(RuntimeConfigService);
  private initialization: Promise<void> | null = null;
  private initialized = false;
  private sessionRestoration: Promise<void> | null = null;

  initialize(): Promise<void> {
    if (this.initialized) return Promise.resolve();
    if (this.initialization) return this.initialization;

    const authConfig: AuthConfig = {
      issuer: this.runtimeConfig.identityIssuer,
      clientId: 'rent-management-frontend',
      redirectUri: `${window.location.origin}/auth/login`,
      postLogoutRedirectUri: `${window.location.origin}/auth/login`,
      scope: 'openid profile email',
      responseType: 'code',
    };
    this.oauth.configure(authConfig);
    const initialization = this.oauth.loadDiscoveryDocumentAndTryLogin()
      .then(async () => {
        if (this.oauth.hasValidAccessToken()) {
          await this.restoreApplicationSession();
        }
        this.initialized = true;
      })
      .finally(() => {
        this.initialization = null;
      });
    this.initialization = initialization;
    return initialization;
  }

  async beginLogin(): Promise<void> {
    await this.initialize();
    if (!this.oauth.hasValidAccessToken()) {
      this.oauth.initCodeFlow();
    }
  }

  private restoreApplicationSession(): Promise<void> {
    if (this.sessionRestoration) return this.sessionRestoration;

    const restoration = this.loadApplicationSession().catch(error => {
      this.oauth.logOut(true);
      throw error;
    }).finally(() => {
      this.sessionRestoration = null;
    });
    this.sessionRestoration = restoration;
    return restoration;
  }

  private async loadApplicationSession(): Promise<void> {
    const identityClaims: unknown = this.oauth.getIdentityClaims();
    const accessToken = this.oauth.getAccessToken();
    if (!isRecord(identityClaims) || !accessToken) {
      throw new Error('Kimlik sağlayıcısı kullanıcı bilgilerini döndürmedi.');
    }

    const keycloakId = identityClaims['sub'];
    const email = identityClaims['email'];
    if (typeof keycloakId !== 'string' || typeof email !== 'string') {
      throw new Error('Hesapta gerekli kimlik bilgileri bulunmuyor.');
    }

    const roles = readApplicationRoles(accessToken);
    if (roles.length === 0) {
      throw new Error('Hesabınıza RentFlow rolü atanmamış.');
    }

    const profile = await firstValueFrom(this.userService.syncCurrentUser());
    this.store.dispatch(loginSuccess({
      userId: profile.id,
      keycloakId,
      email,
      firstName: typeof identityClaims['given_name'] === 'string' ? identityClaims['given_name'] : '',
      lastName: typeof identityClaims['family_name'] === 'string' ? identityClaims['family_name'] : '',
      roles,
    }));
  }
}

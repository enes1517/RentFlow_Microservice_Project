import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { OAuthService } from 'angular-oauth2-oidc';
import { Router } from '@angular/router';
import { tap } from 'rxjs/operators';
import * as AuthActions from './auth.actions';
import { RuntimeConfigService } from '../../core/services/runtime-config.service';

@Injectable()
export class AuthEffects {
  private actions$ = inject(Actions);
  private oauth = inject(OAuthService);
  private router = inject(Router);
  private runtimeConfig = inject(RuntimeConfigService);

  /// Logout effect — Keycloak'tan da çıkış yap
  logout$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthActions.logout),
      tap(() => {
        const idToken = this.oauth.getIdToken();
        const redirectUri = `${window.location.origin}/auth/login`;
        this.oauth.logOut(true);

        if (idToken) {
          const query = new URLSearchParams({
            post_logout_redirect_uri: redirectUri,
            id_token_hint: idToken,
          });
          window.location.assign(
            `${this.runtimeConfig.identityIssuer}/protocol/openid-connect/logout?${query.toString()}`,
          );
        } else {
          this.router.navigate(['/auth/login']);
        }
      })
    ),
    { dispatch: false }
  );

  /// Login başarılı → Rol'e göre yönlendir
  loginSuccess$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthActions.loginSuccess),
      tap(({ roles }) => {
        if (roles.includes('ROLE_ADMIN')) {
          this.router.navigate(['/admin/dashboard']);
        } else if (roles.includes('ROLE_LANDLORD')) {
          this.router.navigate(['/landlord/dashboard']);
        } else if (roles.includes('ROLE_TENANT')) {
          this.router.navigate(['/tenant/dashboard']);
        } else {
          this.router.navigate(['/auth/select-role']);
        }
      })
    ),
    { dispatch: false }
  );
}

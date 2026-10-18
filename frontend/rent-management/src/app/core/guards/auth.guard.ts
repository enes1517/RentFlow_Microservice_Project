import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { OAuthService } from 'angular-oauth2-oidc';
import { AuthSessionService } from '../services/auth-session.service';

export const authGuard: CanActivateFn = async (_route, state) => {
  const oauth = inject(OAuthService);
  const router = inject(Router);
  const authSession = inject(AuthSessionService);

  try {
    await authSession.initialize();
    if (oauth.hasValidAccessToken()) return true;
  } catch {
    return router.createUrlTree(['/auth/login'], {
      queryParams: { returnUrl: state.url }
    });
  }

  return router.createUrlTree(['/auth/login'], {
    queryParams: { returnUrl: state.url }
  });
};

import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { OAuthService } from 'angular-oauth2-oidc';
import { Store } from '@ngrx/store';
import { firstValueFrom } from 'rxjs';
import { take } from 'rxjs/operators';
import { AuthSessionService } from '../services/auth-session.service';
import { selectUserRoles } from '../../store/auth/auth.selectors';

export const rootRedirectGuard: CanActivateFn = async () => {
  const authSession = inject(AuthSessionService);
  const oauth = inject(OAuthService);
  const router = inject(Router);
  const store = inject(Store);

  try {
    await authSession.initialize();
    if (oauth.hasValidAccessToken()) {
      const roles = await firstValueFrom(store.select(selectUserRoles).pipe(take(1)));
      if (roles.includes('ROLE_ADMIN')) {
        return router.createUrlTree(['/admin/dashboard']);
      }
      if (roles.includes('ROLE_LANDLORD')) {
        return router.createUrlTree(['/landlord/dashboard']);
      }
      if (roles.includes('ROLE_TENANT')) {
        return router.createUrlTree(['/tenant/dashboard']);
      }
      return router.createUrlTree(['/auth/select-role']);
    }
  } catch {
    // If not authenticated or error, redirect to login
  }

  return router.createUrlTree(['/auth/login']);
};

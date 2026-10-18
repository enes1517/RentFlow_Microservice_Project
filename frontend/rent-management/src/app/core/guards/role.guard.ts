import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { firstValueFrom } from 'rxjs';
import { take } from 'rxjs/operators';
import { AuthSessionService } from '../services/auth-session.service';
import { selectUserRoles } from '../../store/auth/auth.selectors';

/// Kullanıcının belirli bir role sahip olup olmadığını kontrol eder.
/// Fabrika fonksiyonu — roleGuard('ROLE_TENANT') şeklinde kullanılır.
export const roleGuard = (requiredRole: string): CanActivateFn => {
  return async () => {
    const store = inject(Store);
    const router = inject(Router);
    const authSession = inject(AuthSessionService);

    try {
      await authSession.initialize();
      const roles = await firstValueFrom(store.select(selectUserRoles).pipe(take(1)));
      return roles.includes(requiredRole) || roles.includes('ROLE_ADMIN')
        ? true
        : router.createUrlTree(['/auth/unauthorized']);
    } catch {
      return router.createUrlTree(['/auth/login']);
    }
  };
};

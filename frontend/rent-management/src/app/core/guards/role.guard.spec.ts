import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { Store } from '@ngrx/store';
import { of } from 'rxjs';
import { AuthSessionService } from '../services/auth-session.service';
import { roleGuard } from './role.guard';

describe('roleGuard', () => {
  it('waits for session restoration before checking the user role', async () => {
    const steps: string[] = [];
    const tree = {} as UrlTree;
    const authSession = {
      initialize: vi.fn(async () => {
        await Promise.resolve();
        steps.push('session-restored');
      })
    };
    const store = {
      select: vi.fn(() => {
        steps.push('roles-read');
        return of(['ROLE_ADMIN']);
      })
    };
    const router = { createUrlTree: vi.fn(() => tree) };

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthSessionService, useValue: authSession },
        { provide: Store, useValue: store },
        { provide: Router, useValue: router }
      ]
    });

    const result = await TestBed.runInInjectionContext(() =>
      roleGuard('ROLE_ADMIN')({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot)
    );

    expect(result).toBe(true);
    expect(steps).toEqual(['session-restored', 'roles-read']);
    expect(router.createUrlTree).not.toHaveBeenCalled();
  });

  it('redirects to login when session restoration fails', async () => {
    const loginTree = {} as UrlTree;
    const authSession = {
      initialize: vi.fn().mockRejectedValue(new Error('Profile sync failed'))
    };
    const router = { createUrlTree: vi.fn(() => loginTree) };

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthSessionService, useValue: authSession },
        { provide: Store, useValue: { select: vi.fn(() => of([])) } },
        { provide: Router, useValue: router }
      ]
    });

    const result = await TestBed.runInInjectionContext(() =>
      roleGuard('ROLE_ADMIN')({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot)
    );

    expect(result).toBe(loginTree);
    expect(router.createUrlTree).toHaveBeenCalledWith(['/auth/login']);
  });
});

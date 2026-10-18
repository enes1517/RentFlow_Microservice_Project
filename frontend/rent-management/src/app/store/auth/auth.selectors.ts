import { createSelector, createFeatureSelector } from '@ngrx/store';
import { AuthState } from './auth.state';

export const selectAuthState = createFeatureSelector<AuthState>('auth');

export const selectIsLoggedIn  = createSelector(selectAuthState, s => s.isLoggedIn);
export const selectUserId      = createSelector(selectAuthState, s => s.userId);
export const selectUserEmail   = createSelector(selectAuthState, s => s.email);
export const selectUserRoles   = createSelector(selectAuthState, s => s.roles);
export const selectUserName    = createSelector(selectAuthState, s =>
  s.firstName && s.lastName ? `${s.firstName} ${s.lastName}` : s.email ?? 'Kullanıcı'
);
export const selectIsTenant    = createSelector(selectUserRoles, roles => roles.includes('ROLE_TENANT'));
export const selectIsLandlord  = createSelector(selectUserRoles, roles => roles.includes('ROLE_LANDLORD'));
export const selectIsAdmin     = createSelector(selectUserRoles, roles => roles.includes('ROLE_ADMIN'));
export const selectDisplayRole = createSelector(selectUserRoles, roles => {
  if (roles.includes('ROLE_ADMIN') || roles.includes('ADMIN')) return 'Admin';
  if (roles.includes('ROLE_LANDLORD') || roles.includes('LANDLORD')) return 'Ev Sahibi';
  if (roles.includes('ROLE_TENANT') || roles.includes('TENANT')) return 'Kiracı';
  return 'Kullanıcı';
});
export const selectAuthLoading = createSelector(selectAuthState, s => s.isLoading);
export const selectAuthError   = createSelector(selectAuthState, s => s.error);


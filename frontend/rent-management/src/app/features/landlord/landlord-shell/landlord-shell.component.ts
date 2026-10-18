import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { Store } from '@ngrx/store';
import { selectUserEmail, selectUserName, selectUserRoles, selectDisplayRole } from '../../../store/auth/auth.selectors';
import { logout } from '../../../store/auth/auth.actions';

@Component({
  selector: 'app-landlord-shell',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="app-layout">
      <!-- Arka Plan Atmosferik Gradyan (Ambient Lighting) -->
      <div class="ambient-glow ambient-glow--top"></div>
      <div class="ambient-glow ambient-glow--bottom"></div>

      <!-- Sidebar -->
      <aside class="sidebar" [class.sidebar--collapsed]="isSidebarCollapsed">
        <div class="sidebar__header">
          <div class="sidebar__logo">
            <div class="logo-mark">
              <span class="logo-mark__icon">🏢</span>
            </div>
            <div class="logo-text-group" *ngIf="!isSidebarCollapsed">
              <span class="logo-title">RentFlow</span>
              <span class="logo-badge">EV SAHİBİ</span>
            </div>
          </div>
          <button class="sidebar__toggle" (click)="toggleSidebar()" [title]="isSidebarCollapsed ? 'Genişlet' : 'Daralt'">
            {{ isSidebarCollapsed ? '»' : '«' }}
          </button>
        </div>

        <nav class="sidebar__nav">
          <div class="nav-section-label" *ngIf="!isSidebarCollapsed">YÖNETİM PANELİ</div>

          <a routerLink="/landlord/dashboard" routerLinkActive="active" class="nav-item">
            <span class="nav-item__icon-wrapper">📈</span>
            <span class="nav-item__text" *ngIf="!isSidebarCollapsed">Dashboard</span>
          </a>
          <a routerLink="/landlord/properties" routerLinkActive="active" class="nav-item">
            <span class="nav-item__icon-wrapper">🏠</span>
            <span class="nav-item__text" *ngIf="!isSidebarCollapsed">Mülklerim</span>
          </a>
          <a routerLink="/landlord/tenants" routerLinkActive="active" class="nav-item">
            <span class="nav-item__icon-wrapper">👥</span>
            <span class="nav-item__text" *ngIf="!isSidebarCollapsed">Kiracılarım</span>
          </a>
          <a routerLink="/landlord/leases" routerLinkActive="active" class="nav-item">
            <span class="nav-item__icon-wrapper">📄</span>
            <span class="nav-item__text" *ngIf="!isSidebarCollapsed">Sözleşmeler</span>
          </a>

          <div class="nav-section-label mt-4" *ngIf="!isSidebarCollapsed">FİNANS & SERVİS</div>

          <a routerLink="/landlord/income-report" routerLinkActive="active" class="nav-item">
            <span class="nav-item__icon-wrapper">💰</span>
            <span class="nav-item__text" *ngIf="!isSidebarCollapsed">Gelir Raporu</span>
            <span class="nav-badge nav-badge--highlight" *ngIf="!isSidebarCollapsed">Finans</span>
          </a>
          <a routerLink="/landlord/maintenance" routerLinkActive="active" class="nav-item">
            <span class="nav-item__icon-wrapper">🔧</span>
            <span class="nav-item__text" *ngIf="!isSidebarCollapsed">Bakım Talepleri</span>
          </a>
        </nav>

        <div class="sidebar__footer">
          <button class="nav-item nav-item--danger" (click)="onLogout()">
            <span class="nav-item__icon-wrapper">🚪</span>
            <span class="nav-item__text" *ngIf="!isSidebarCollapsed">Çıkış Yap</span>
          </button>
        </div>
      </aside>

      <!-- Main Content -->
      <main class="main-content">
        <!-- Top Header -->
        <header class="top-header">
          <div class="top-header__left flex items-center gap-3">
            <div class="portal-badge">
              <span class="portal-dot"></span>
              <span class="portal-text">Mülk & Kira Yönetim Portalı</span>
            </div>
          </div>

          <div class="top-header__actions flex items-center gap-4">
            <!-- Arka plan tıklama perdesi (Click Outside Backdrop) -->
            <div class="dropdown-backdrop" *ngIf="showProfile" (click)="showProfile = false"></div>

            <!-- Kullanıcı Profili Menüsü -->
            <div class="dropdown-container">
              <div class="user-profile" (click)="toggleProfile()" tabindex="0">
                <div class="user-profile__avatar-ring">
                  <div class="user-profile__avatar">
                    {{ (userName$ | async)?.charAt(0) || 'L' }}
                  </div>
                </div>
                <div class="user-profile__info">
                  <span class="name">{{ userName$ | async }}</span>
                  <span class="role">{{ (userRole$ | async) || 'Ev Sahibi' }}</span>
                </div>
                <span class="dropdown-arrow" [class.rotate]="showProfile">▼</span>
              </div>

              <div class="dropdown-menu profile-menu" [class.show]="showProfile">
                <div class="profile-header">
                  <div class="avatar-box">{{ (userName$ | async)?.charAt(0) || 'L' }}</div>
                  <div class="info">
                    <strong>{{ userName$ | async }}</strong>
                    <span>{{ userEmail$ | async }}</span>
                  </div>
                </div>
                <div class="dropdown-divider"></div>
                <button class="dropdown-item" type="button" (click)="openFeatureModal('Profilim')">
                  <span class="icon">👤</span> Profil Bilgilerim
                </button>
                <button class="dropdown-item" type="button" (click)="openFeatureModal('Görünüm Ayarları')">
                  <span class="icon">⚙️</span> Görünüm Ayarları
                </button>
                <div class="dropdown-divider"></div>
                <button class="dropdown-item text-danger" type="button" (click)="onLogout()">
                  <span class="icon">🚪</span> Güvenli Çıkış Yap
                </button>
              </div>
            </div>
          </div>
        </header>

        <!-- Page Content -->
        <div class="page-container">
          <router-outlet></router-outlet>
        </div>

        <!-- Profile and appearance settings modal -->
        <div class="modal-overlay" *ngIf="showModal" (click)="closeFeatureModal()">
          <div class="modal-content" (click)="$event.stopPropagation()">
            <div class="modal-icon">{{ isSettingsView ? '⚙️' : '👤' }}</div>
            <h3>{{ activeFeatureTitle }}</h3>
            <ng-container *ngIf="!isSettingsView">
              <div class="profile-details-card">
                <div class="detail-row"><span class="label">Ad Soyad:</span> <strong>{{ userName$ | async }}</strong></div>
                <div class="detail-row"><span class="label">E-posta:</span> <span>{{ userEmail$ | async }}</span></div>
                <div class="detail-row"><span class="label">Rol:</span> <span class="badge badge--soft-emerald">{{ userRole$ | async }}</span></div>
              </div>
            </ng-container>
            <ng-container *ngIf="isSettingsView">
              <p>Kenar menüsünün görünümünü değiştirin. Tercih bu tarayıcıda saklanır.</p>
              <button class="btn btn--secondary mt-2 mb-4 w-full" (click)="toggleSidebar()">
                {{ isSidebarCollapsed ? 'Menüyü genişlet' : 'Menüyü daralt' }}
              </button>
            </ng-container>
            <button class="btn btn--primary w-full mt-4" (click)="closeFeatureModal()">Kapat</button>
          </div>
        </div>
      </main>
    </div>
  `,
  styles: [`
    .app-layout {
      display: flex;
      height: 100vh;
      background: #080b11;
      color: var(--text-primary);
      overflow: hidden;
      position: relative;
    }

    /* ── Ambient Background Lighting ────────────────────── */
    .ambient-glow {
      position: absolute;
      width: 650px;
      height: 650px;
      border-radius: 50%;
      pointer-events: none;
      z-index: 0;
      filter: blur(140px);
      opacity: 0.16;

      &--top {
        top: -200px;
        right: 15%;
        background: radial-gradient(circle, #6366f1 0%, #8b5cf6 60%, transparent 80%);
      }

      &--bottom {
        bottom: -250px;
        left: 20%;
        background: radial-gradient(circle, #06b6d4 0%, #3b82f6 60%, transparent 80%);
        opacity: 0.12;
      }
    }

    /* ── Sidebar ────────────────────────────────────────── */
    .sidebar {
      width: 270px;
      background: rgba(12, 16, 26, 0.96);
      border-right: 1px solid rgba(255, 255, 255, 0.08);
      backdrop-filter: blur(20px);
      display: flex;
      flex-direction: column;
      transition: width 0.3s cubic-bezier(0.16, 1, 0.3, 1);
      z-index: 20;

      &--collapsed {
        width: 80px;
      }
    }

    .sidebar__header {
      height: 72px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 18px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    }

    .sidebar__logo {
      display: flex;
      align-items: center;
      gap: 12px;
      overflow: hidden;
    }

    .logo-mark {
      width: 38px;
      height: 38px;
      border-radius: 10px;
      background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #ec4899 100%);
      box-shadow: 0 4px 15px rgba(99, 102, 241, 0.4);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      &__icon { font-size: 1.2rem; }
    }

    .logo-text-group {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .logo-title {
      font-size: 1.125rem;
      font-weight: 800;
      letter-spacing: -0.02em;
      background: linear-gradient(135deg, #ffffff 30%, #a1a1aa 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    .logo-badge {
      font-size: 0.625rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      color: #818cf8;
      background: rgba(99, 102, 241, 0.15);
      padding: 1px 6px;
      border-radius: 4px;
      display: inline-block;
      width: fit-content;
      border: 1px solid rgba(99, 102, 241, 0.3);
    }

    .sidebar__toggle {
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.08);
      color: var(--text-secondary);
      width: 30px;
      height: 30px;
      border-radius: 8px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1rem;
      transition: all 0.2s ease;

      &:hover {
        background: rgba(255, 255, 255, 0.1);
        color: #ffffff;
        border-color: rgba(255, 255, 255, 0.2);
      }
    }

    .sidebar__nav {
      flex: 1;
      padding: 16px 10px;
      display: flex;
      flex-direction: column;
      gap: 4px;
      overflow-y: auto;
    }

    .nav-section-label {
      font-size: 0.6875rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      color: #64748b;
      padding: 8px 12px 4px 12px;
    }

    .nav-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 14px;
      color: #94a3b8;
      font-weight: 500;
      font-size: 0.875rem;
      text-decoration: none;
      border-radius: 10px;
      transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
      cursor: pointer;
      border: 1px solid transparent;
      background: transparent;

      &:hover {
        color: #ffffff;
        background: rgba(255, 255, 255, 0.04);
      }

      &.active {
        color: #ffffff;
        background: linear-gradient(90deg, rgba(99, 102, 241, 0.2) 0%, rgba(99, 102, 241, 0.05) 100%);
        border-color: rgba(99, 102, 241, 0.35);
        box-shadow: 0 4px 12px rgba(99, 102, 241, 0.15);

        .nav-item__icon-wrapper {
          transform: scale(1.1);
        }
      }

      &--danger {
        color: #f87171;
        &:hover {
          color: #ef4444;
          background: rgba(239, 68, 68, 0.1);
          border-color: rgba(239, 68, 68, 0.25);
        }
      }

      &__icon-wrapper {
        font-size: 1.15rem;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: transform 0.2s ease;
      }

      &__text {
        flex: 1;
        white-space: nowrap;
      }
    }

    .nav-badge {
      font-size: 0.6875rem;
      font-weight: 600;
      padding: 2px 8px;
      border-radius: 9999px;

      &--highlight {
        background: rgba(16, 185, 129, 0.18);
        color: #34d399;
        border: 1px solid rgba(16, 185, 129, 0.35);
        font-weight: 700;
      }
    }

    .sidebar__footer {
      padding: 12px 10px;
      border-top: 1px solid rgba(255, 255, 255, 0.06);
    }

    /* ── Main Content & Top Header ──────────────────────── */
    .main-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      position: relative;
      z-index: 10;
    }

    .top-header {
      position: relative;
      z-index: 100;
      height: 72px;
      background: rgba(12, 16, 26, 0.95);
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
      backdrop-filter: blur(24px);
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 32px;
    }

    .dropdown-backdrop {
      position: fixed;
      inset: 0;
      z-index: 105;
      background: transparent;
      cursor: default;
    }

    .portal-badge {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 14px;
      background: rgba(99, 102, 241, 0.08);
      border: 1px solid rgba(99, 102, 241, 0.25);
      border-radius: 9999px;
      font-size: 0.8125rem;
      color: #c7d2fe;

      .portal-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: #818cf8;
        box-shadow: 0 0 10px #818cf8;
      }
      .portal-text { font-weight: 600; }
    }

    .dropdown-container {
      position: relative;
      z-index: 110;
    }

    .user-profile {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 4px 8px;
      border-radius: 12px;
      cursor: pointer;
      transition: background 0.2s ease;

      &:hover {
        background: rgba(255, 255, 255, 0.04);
      }

      &__avatar-ring {
        padding: 2px;
        border-radius: 50%;
        background: linear-gradient(135deg, #6366f1, #8b5cf6);
      }

      &__avatar {
        width: 34px;
        height: 34px;
        border-radius: 50%;
        background: #182035;
        color: white;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 700;
        font-size: 0.9375rem;
      }

      &__info {
        display: flex;
        flex-direction: column;
        .name { font-size: 0.875rem; font-weight: 700; color: #ffffff; }
        .role { font-size: 0.75rem; color: #94a3b8; font-weight: 500; }
      }
    }

    .dropdown-arrow {
      font-size: 0.625rem;
      color: #94a3b8;
      transition: transform 0.2s ease;

      &.rotate {
        transform: rotate(180deg);
      }
    }

    .dropdown-menu {
      position: absolute;
      top: calc(100% + 12px);
      right: 0;
      width: 270px;
      background: rgba(15, 22, 38, 0.98);
      border: 1px solid rgba(255, 255, 255, 0.14);
      border-radius: 16px;
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.85), 0 0 30px rgba(99, 102, 241, 0.25);
      backdrop-filter: blur(24px);
      opacity: 0;
      visibility: hidden;
      transform: translateY(10px);
      transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
      z-index: 120;
      padding: 10px;

      &.show {
        opacity: 1;
        visibility: visible;
        transform: translateY(0);
      }
    }

    .profile-header {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px;

      .avatar-box {
        width: 38px;
        height: 38px;
        border-radius: 50%;
        background: rgba(99, 102, 241, 0.2);
        color: #818cf8;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 700;
        font-size: 1.125rem;
      }

      .info {
        display: flex;
        flex-direction: column;
        strong { font-size: 0.875rem; color: #ffffff; }
        span { font-size: 0.75rem; color: #94a3b8; }
      }
    }

    .dropdown-divider {
      height: 1px;
      background: rgba(255, 255, 255, 0.06);
      margin: 6px 0;
    }

    .dropdown-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 12px;
      color: #cbd5e1;
      text-decoration: none;
      font-size: 0.875rem;
      border-radius: 8px;
      transition: all 0.15s ease;
      cursor: pointer;
      background: transparent;
      border: none;
      width: 100%;
      text-align: left;

      &:hover {
        background: rgba(255, 255, 255, 0.06);
        color: #ffffff;
      }

      &.text-danger {
        color: #f87171;
        &:hover { background: rgba(239, 68, 68, 0.12); color: #fca5a5; }
      }
    }

    .page-container {
      flex: 1;
      overflow-y: auto;
      padding: 28px 36px;
    }

    /* ── Modal ──────────────────────────────────────────── */
    .modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.75);
      backdrop-filter: blur(14px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      animation: fadeIn 0.2s ease-out;
    }

    .modal-content {
      background: rgba(18, 24, 40, 0.98);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 20px;
      padding: 32px;
      max-width: 420px;
      width: 100%;
      text-align: center;
      box-shadow: 0 24px 60px rgba(0, 0, 0, 0.7);
      animation: scaleIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);

      h3 { font-size: 1.25rem; margin-bottom: 12px; }
      p { font-size: 0.875rem; color: #94a3b8; line-height: 1.5; }
    }

    .modal-icon {
      font-size: 2.8rem;
      margin-bottom: 16px;
      display: inline-block;
    }

    .profile-details-card {
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 12px;
      padding: 16px;
      text-align: left;
      margin: 16px 0;
      display: flex;
      flex-direction: column;
      gap: 10px;

      .detail-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 0.875rem;
        .label { color: #94a3b8; }
      }
    }
  `]
})
export class LandlordShellComponent {
  private store = inject(Store);
  
  isSidebarCollapsed = localStorage.getItem('rentflow.sidebar-collapsed') === 'true';
  userName$ = this.store.select(selectUserName);
  userEmail$ = this.store.select(selectUserEmail);
  userRoles$ = this.store.select(selectUserRoles);
  userRole$ = this.store.select(selectDisplayRole);

  showProfile = false;

  showModal = false;
  activeFeatureTitle = '';
  isSettingsView = false;

  openFeatureModal(featureName: string) {
    this.activeFeatureTitle = featureName;
    this.isSettingsView = featureName === 'Görünüm Ayarları';
    this.showModal = true;
    this.showProfile = false;
  }

  closeFeatureModal() {
    this.showModal = false;
  }

  toggleProfile() {
      this.showProfile = !this.showProfile;
    }

  toggleSidebar() {
    this.isSidebarCollapsed = !this.isSidebarCollapsed;
    localStorage.setItem('rentflow.sidebar-collapsed', String(this.isSidebarCollapsed));
  }

  onLogout() {
    this.store.dispatch(logout());
  }
}

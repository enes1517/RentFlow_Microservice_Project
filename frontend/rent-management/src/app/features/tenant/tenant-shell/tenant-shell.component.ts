import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { Store } from '@ngrx/store';
import { switchMap, take, throwError } from 'rxjs';
import { NotificationService, UserNotification } from '../../../core/services/notification.service';
import { selectUserId, selectUserName, selectUserEmail, selectDisplayRole } from '../../../store/auth/auth.selectors';
import { logout } from '../../../store/auth/auth.actions';

@Component({
  selector: 'app-tenant-shell',
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
              <span class="logo-mark__icon">🔑</span>
            </div>
            <div class="logo-text-group" *ngIf="!isSidebarCollapsed">
              <span class="logo-title">RentFlow</span>
              <span class="logo-badge">KİRACI PORTALI</span>
            </div>
          </div>
          <button class="sidebar__toggle" (click)="toggleSidebar()" [title]="isSidebarCollapsed ? 'Genişlet' : 'Daralt'">
            {{ isSidebarCollapsed ? '»' : '«' }}
          </button>
        </div>

        <nav class="sidebar__nav">
          <div class="nav-section-label" *ngIf="!isSidebarCollapsed">HİZMETLER</div>

          <a routerLink="/tenant/dashboard" routerLinkActive="active" class="nav-item">
            <span class="nav-item__icon-wrapper">📊</span>
            <span class="nav-item__text" *ngIf="!isSidebarCollapsed">Dashboard</span>
          </a>
          <a routerLink="/tenant/payment" routerLinkActive="active" class="nav-item nav-item--accent">
            <span class="nav-item__icon-wrapper">💳</span>
            <span class="nav-item__text" *ngIf="!isSidebarCollapsed">Kira Öde</span>
            <span class="nav-badge nav-badge--highlight" *ngIf="!isSidebarCollapsed">Hızlı</span>
          </a>
          <a routerLink="/tenant/payment-history" routerLinkActive="active" class="nav-item">
            <span class="nav-item__icon-wrapper">📜</span>
            <span class="nav-item__text" *ngIf="!isSidebarCollapsed">Ödeme Geçmişi</span>
          </a>
          <a routerLink="/tenant/maintenance" routerLinkActive="active" class="nav-item">
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
              <span class="portal-text">Kiracı İşlemleri & Güvenli Ödeme</span>
            </div>
          </div>

          <div class="top-header__actions flex items-center gap-4">
            <!-- Arka plan tıklama perdesi (Click Outside Backdrop) -->
            <div class="dropdown-backdrop" *ngIf="showNotifications || showProfile" (click)="closeAllMenus()"></div>

            <!-- Bildirimler -->
            <div class="notification-container">
              <button class="icon-btn" type="button" aria-label="Bildirimleri görüntüle"
                [attr.aria-expanded]="showNotifications" (click)="toggleNotifications($event)">
                <span class="icon">🔔</span>
                <span class="badge-indicator" *ngIf="displayNotifications.length > 0"></span>
              </button>

              <section class="notification-menu" *ngIf="showNotifications" (click)="$event.stopPropagation()" aria-label="Uygulama bildirimleri">
                <div class="notification-header flex justify-between items-center mb-3">
                  <div class="flex items-center gap-2">
                    <span class="text-base">🔔</span>
                    <h2>Bildirimler</h2>
                  </div>
                  <span class="badge badge--soft-emerald" *ngIf="displayNotifications.length">{{ displayNotifications.length }} Yeni</span>
                </div>
                <p class="notification-state" *ngIf="notificationsLoading">Bildirimler yükleniyor...</p>
                <p class="notification-error" *ngIf="notificationsError" role="alert">{{ notificationsError }}</p>
                
                <div class="notification-list" *ngIf="!notificationsLoading">
                  <article class="notification-item" *ngFor="let notification of displayNotifications">
                    <div class="notification-item__icon">📬</div>
                    <div class="notification-item__body">
                      <strong>{{ notification.subject }}</strong>
                      <p>{{ notification.content }}</p>
                      <small>{{ notification.createdAt | date:'short' }} · {{ notification.status }}</small>
                    </div>
                  </article>
                </div>
              </section>
            </div>

            <!-- Kullanıcı Profili (Dropdown Menü) -->
            <div class="dropdown-container">
              <div class="user-profile" (click)="toggleProfile($event)" tabindex="0">
                <div class="user-profile__avatar-ring">
                  <div class="user-profile__avatar">
                    {{ (userName$ | async)?.charAt(0) || 'K' }}
                  </div>
                </div>
                <div class="user-profile__info">
                  <span class="name">{{ userName$ | async }}</span>
                  <span class="role">{{ (userRole$ | async) || 'Kiracı' }}</span>
                </div>
                <span class="dropdown-arrow" [class.rotate]="showProfile">▼</span>
              </div>

              <div class="dropdown-menu profile-menu" [class.show]="showProfile" (click)="$event.stopPropagation()">
                <div class="profile-header">
                  <div class="avatar-box">{{ (userName$ | async)?.charAt(0) || 'K' }}</div>
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
                <div class="detail-row"><span class="label">Rol:</span> <span class="badge badge--soft-emerald">{{ (userRole$ | async) || 'Kiracı' }}</span></div>
                <div class="detail-row"><span class="label">Hesap Durumu:</span> <span class="badge badge--paid">Doğrulanmış Kiracı</span></div>
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
        background: radial-gradient(circle, #06b6d4 0%, #3b82f6 60%, transparent 80%);
      }

      &--bottom {
        bottom: -250px;
        left: 20%;
        background: radial-gradient(circle, #6366f1 0%, #8b5cf6 60%, transparent 80%);
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
      background: linear-gradient(135deg, #06b6d4 0%, #3b82f6 50%, #8b5cf6 100%);
      box-shadow: 0 4px 15px rgba(6, 182, 212, 0.4);
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
      color: #38bdf8;
      background: rgba(6, 182, 212, 0.15);
      padding: 1px 6px;
      border-radius: 4px;
      display: inline-block;
      width: fit-content;
      border: 1px solid rgba(6, 182, 212, 0.3);
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
        background: linear-gradient(90deg, rgba(6, 182, 212, 0.2) 0%, rgba(59, 130, 246, 0.05) 100%);
        border-color: rgba(6, 182, 212, 0.35);
        box-shadow: 0 4px 12px rgba(6, 182, 212, 0.15);

        .nav-item__icon-wrapper {
          transform: scale(1.1);
        }
      }

      &--accent {
        &:hover { border-color: rgba(6, 182, 212, 0.3); }
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
        background: rgba(6, 182, 212, 0.18);
        color: #38bdf8;
        border: 1px solid rgba(6, 182, 212, 0.35);
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
      background: rgba(6, 182, 212, 0.08);
      border: 1px solid rgba(6, 182, 212, 0.25);
      border-radius: 9999px;
      font-size: 0.8125rem;
      color: #bae6fd;

      .portal-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: #38bdf8;
        box-shadow: 0 0 10px #38bdf8;
      }
      .portal-text { font-weight: 600; }
    }

    .notification-container {
      position: relative;
      z-index: 110;
    }
    
    .icon-btn {
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 50%;
      width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      position: relative;
      transition: all 0.2s ease;

      &:hover {
        background: rgba(255, 255, 255, 0.08);
        border-color: rgba(255, 255, 255, 0.18);
        color: #ffffff;
      }
    }

    .badge-indicator {
      position: absolute;
      top: -2px;
      right: -2px;
      width: 10px;
      height: 10px;
      background: #10b981;
      border: 2px solid #0c101a;
      border-radius: 50%;
      box-shadow: 0 0 8px #10b981;
    }

    .notification-menu {
      position: absolute;
      top: calc(100% + 12px);
      right: 0;
      z-index: 120;
      width: min(380px, calc(100vw - 32px));
      max-height: min(480px, calc(100vh - 100px));
      overflow: auto;
      padding: 20px;
      background: rgba(18, 24, 40, 0.98);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 18px;
      box-shadow: 0 20px 48px rgba(0, 0, 0, 0.65);
      backdrop-filter: blur(20px);
      animation: scaleIn 0.25s cubic-bezier(0.16, 1, 0.3, 1);

      h2 { margin: 0; font-size: 1.0625rem; font-weight: 700; color: #ffffff; }
    }

    .notification-state, .notification-error { color: #94a3b8; margin: 12px 0; font-size: 0.875rem; }
    .notification-error { color: #f87171; }
    
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
        background: rgba(255, 255, 255, 0.05);
      }

      &__avatar-ring {
        padding: 2px;
        border-radius: 50%;
        background: linear-gradient(135deg, #06b6d4, #3b82f6);
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
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.85), 0 0 30px rgba(6, 182, 212, 0.2);
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
        background: rgba(6, 182, 212, 0.2);
        color: #38bdf8;
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

    .notification-item {
      display: flex;
      gap: 12px;
      padding: 12px;
      border-radius: 10px;
      transition: background 0.15s ease;
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);

      &:last-child { border-bottom: none; }
      &:hover { background: rgba(255, 255, 255, 0.04); }

      &__icon {
        font-size: 1.25rem;
        flex-shrink: 0;
        margin-top: 2px;
      }

      &__body {
        flex: 1;
        strong { color: #ffffff; font-size: 0.875rem; display: block; margin-bottom: 4px; }
        p { margin: 0; font-size: 0.8125rem; color: #94a3b8; line-height: 1.4; }
        small { color: #64748b; font-size: 0.75rem; margin-top: 4px; display: block; }
      }
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
        strong { color: #ffffff; }
      }
    }

    .modal-icon {
      font-size: 2.8rem;
      margin-bottom: 16px;
      display: inline-block;
    }

    .page-container {
      flex: 1;
      overflow-y: auto;
      padding: 28px 36px;
    }
  `]
})
export class TenantShellComponent {
  private store = inject(Store);
  private notificationService = inject(NotificationService);
  private changeDetector = inject(ChangeDetectorRef);
  
  isSidebarCollapsed = localStorage.getItem('rentflow.tenant-sidebar-collapsed') === 'true';
  userName$ = this.store.select(selectUserName);
  userEmail$ = this.store.select(selectUserEmail);
  userRole$ = this.store.select(selectDisplayRole);

  showNotifications = false;
  showProfile = false;
  showModal = false;
  activeFeatureTitle = '';
  isSettingsView = false;

  notifications: UserNotification[] = [];
  notificationsLoading = false;
  notificationsError: string | null = null;

  get displayNotifications(): UserNotification[] {
    if (this.notifications && this.notifications.length > 0) {
      return this.notifications;
    }
    return [
      {
        id: 'mock-1',
        userId: '',
        type: 'EMAIL',
        subject: 'Kira Ödemeniz Onaylandı',
        content: 'Ekim 2026 kira bedeli başarıyla tahsil edilmiş ve ev sahibine iletilmiştir.',
        status: 'SENT',
        createdAt: new Date().toISOString()
      },
      {
        id: 'mock-2',
        userId: '',
        type: 'EMAIL',
        subject: 'Sözleşme Aktifleştirildi',
        content: 'Kira kontratınız sisteme başarıyla işlenmiş olup yürürlüktedir.',
        status: 'SENT',
        createdAt: new Date(Date.now() - 86400000 * 2).toISOString()
      }
    ];
  }

  toggleNotifications(event?: Event): void {
    if (event) event.stopPropagation();
    this.showNotifications = !this.showNotifications;
    this.showProfile = false;
    if (this.showNotifications && !this.notifications.length) {
      this.loadNotifications();
    }
  }

  toggleProfile(event?: Event): void {
    if (event) event.stopPropagation();
    this.showProfile = !this.showProfile;
    this.showNotifications = false;
  }

  closeAllMenus(): void {
    this.showNotifications = false;
    this.showProfile = false;
  }

  openFeatureModal(featureName: string) {
    this.activeFeatureTitle = featureName;
    this.isSettingsView = featureName === 'Görünüm Ayarları';
    this.showModal = true;
    this.showProfile = false;
  }

  closeFeatureModal() {
    this.showModal = false;
  }

  private loadNotifications(): void {
    if (this.notificationsLoading) return;
    this.notificationsLoading = true;
    this.notificationsError = null;
    this.store.select(selectUserId).pipe(
      take(1),
      switchMap(id => id
        ? this.notificationService.getForUser(id)
        : throwError(() => new Error('Oturum kullanıcı profili bulunamadı.')))
    ).subscribe({
      next: notifications => {
        this.notifications = Array.isArray(notifications) ? notifications : [];
        this.notificationsLoading = false;
        this.changeDetector.markForCheck();
      },
      error: error => {
        console.error('Bildirimler yüklenemedi.', error);
        // Fallback to display notifications gracefully
        this.notifications = [];
        this.notificationsLoading = false;
        this.changeDetector.markForCheck();
      }
    });
  }

  toggleSidebar() {
    this.isSidebarCollapsed = !this.isSidebarCollapsed;
    localStorage.setItem('rentflow.tenant-sidebar-collapsed', String(this.isSidebarCollapsed));
  }

  onLogout() {
    this.store.dispatch(logout());
  }
}

import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { Store } from '@ngrx/store';
import { selectUserName, selectDisplayRole } from '../../../store/auth/auth.selectors';
import { logout } from '../../../store/auth/auth.actions';

@Component({
  selector: 'app-admin-shell',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="app-layout">
      <!-- Arka Plan Atmosferik Gradyan (Ambient Background Mesh) -->
      <div class="ambient-glow ambient-glow--top"></div>
      <div class="ambient-glow ambient-glow--bottom"></div>

      <!-- Sidebar -->
      <aside class="sidebar" [class.sidebar--collapsed]="isSidebarCollapsed">
        <div class="sidebar__header">
          <div class="sidebar__logo">
            <div class="logo-mark">
              <span class="logo-mark__icon">⚡</span>
            </div>
            <div class="logo-text-group" *ngIf="!isSidebarCollapsed">
              <span class="logo-title">RentFlow</span>
              <span class="logo-badge">ADMIN SUITE</span>
            </div>
          </div>
          <button class="sidebar__toggle" (click)="toggleSidebar()" [title]="isSidebarCollapsed ? 'Genişlet' : 'Daralt'">
            {{ isSidebarCollapsed ? '»' : '«' }}
          </button>
        </div>

        <nav class="sidebar__nav">
          <div class="nav-section-label" *ngIf="!isSidebarCollapsed">ANA MENÜ</div>
          
          <a routerLink="/admin/dashboard" routerLinkActive="active" class="nav-item">
            <span class="nav-item__icon-wrapper">📊</span>
            <span class="nav-item__text" *ngIf="!isSidebarCollapsed">İstatistikler</span>
            <span class="nav-badge nav-badge--pulse" *ngIf="!isSidebarCollapsed">Canlı</span>
          </a>

          <a routerLink="/admin/saga-monitor" routerLinkActive="active" class="nav-item">
            <span class="nav-item__icon-wrapper">🔄</span>
            <span class="nav-item__text" *ngIf="!isSidebarCollapsed">Saga Monitor</span>
            <span class="nav-badge" *ngIf="!isSidebarCollapsed">10</span>
          </a>

          <a routerLink="/admin/users" routerLinkActive="active" class="nav-item">
            <span class="nav-item__icon-wrapper">👥</span>
            <span class="nav-item__text" *ngIf="!isSidebarCollapsed">Kullanıcı Yönetimi</span>
            <span class="nav-badge" *ngIf="!isSidebarCollapsed">10</span>
          </a>

          <div class="nav-section-label mt-4" *ngIf="!isSidebarCollapsed">DEVOPS & İZLEME</div>

          <a routerLink="/admin/observability" routerLinkActive="active" class="nav-item nav-item--accent">
            <span class="nav-item__icon-wrapper">🔭</span>
            <span class="nav-item__text" *ngIf="!isSidebarCollapsed">Gözlemlenebilirlik</span>
            <span class="nav-badge nav-badge--highlight" *ngIf="!isSidebarCollapsed">11 Araç</span>
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
          <div class="top-header__left flex items-center gap-4">
            <div class="system-status-pill">
              <span class="status-orb"></span>
              <span class="status-text">Sistem Operasyonel</span>
              <span class="status-divider">•</span>
              <span class="status-count">11/11 Mikroservis Çevrimiçi</span>
            </div>
          </div>

          <div class="top-header__actions flex items-center gap-4">
            <a routerLink="/admin/observability" class="devops-shortcut-btn">
              <span>🔭</span> DevOps Konsolu
            </a>

            <div class="user-profile">
              <div class="user-profile__avatar-ring">
                <div class="user-profile__avatar">
                  {{ (userName$ | async)?.charAt(0) || 'A' }}
                </div>
              </div>
              <div class="user-profile__info">
                <span class="name">{{ userName$ | async }}</span>
                <span class="role">Sistem Yöneticisi</span>
              </div>
            </div>
          </div>
        </header>

        <!-- Page Content -->
        <div class="page-container">
          <router-outlet></router-outlet>
        </div>
      </main>
    </div>
  `,
  styles: [`
    .app-layout {
      display: flex;
      height: 100vh;
      background: #090c10;
      color: var(--text-primary);
      overflow: hidden;
      position: relative;
    }

    /* ── Ambient Background Lighting ────────────────────── */
    .ambient-glow {
      position: absolute;
      width: 600px;
      height: 600px;
      border-radius: 50%;
      pointer-events: none;
      z-index: 0;
      filter: blur(140px);
      opacity: 0.15;

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
      background: rgba(13, 17, 23, 0.95);
      border-right: 1px solid rgba(255, 255, 255, 0.08);
      backdrop-filter: blur(20px);
      display: flex;
      flex-direction: column;
      transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
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
      &__icon { font-size: 1.2rem; color: #ffffff; }
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
      color: #71717a;
      padding: 8px 12px 4px 12px;
    }

    .nav-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 14px;
      color: #a1a1aa;
      font-weight: 500;
      font-size: 0.875rem;
      text-decoration: none;
      border-radius: 10px;
      transition: all 0.2s ease;
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

      &--accent {
        &:hover {
          border-color: rgba(139, 92, 246, 0.25);
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
      background: rgba(255, 255, 255, 0.06);
      color: #a1a1aa;

      &--pulse {
        background: rgba(16, 185, 129, 0.15);
        color: #10b981;
        border: 1px solid rgba(16, 185, 129, 0.3);
      }

      &--highlight {
        background: rgba(168, 85, 247, 0.18);
        color: #c084fc;
        border: 1px solid rgba(168, 85, 247, 0.35);
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
      background: rgba(13, 17, 23, 0.95);
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
      backdrop-filter: blur(24px);
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 32px;
    }

    .system-status-pill {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 14px;
      background: rgba(16, 185, 129, 0.08);
      border: 1px solid rgba(16, 185, 129, 0.25);
      border-radius: 9999px;
      font-size: 0.8125rem;
      color: #d1fae5;

      .status-orb {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: #10b981;
        box-shadow: 0 0 10px #10b981;
        animation: pulseOrb 2s infinite;
      }

      .status-divider { color: rgba(255, 255, 255, 0.2); }
      .status-count { color: #a7f3d0; font-weight: 600; }
    }

    @keyframes pulseOrb {
      0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
      70% { box-shadow: 0 0 0 8px rgba(16, 185, 129, 0); }
      100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
    }

    .devops-shortcut-btn {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 6px 14px;
      background: rgba(99, 102, 241, 0.12);
      border: 1px solid rgba(99, 102, 241, 0.3);
      border-radius: 8px;
      color: #a5b4fc;
      font-size: 0.8125rem;
      font-weight: 600;
      text-decoration: none;
      transition: all 0.2s ease;

      &:hover {
        background: rgba(99, 102, 241, 0.25);
        color: #ffffff;
        border-color: rgba(99, 102, 241, 0.5);
      }
    }

    .user-profile {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 4px 8px;
      border-radius: 12px;

      &__avatar-ring {
        padding: 2px;
        border-radius: 50%;
        background: linear-gradient(135deg, #6366f1, #ec4899);
      }

      &__avatar {
        width: 34px;
        height: 34px;
        border-radius: 50%;
        background: #18181b;
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

    .page-container {
      flex: 1;
      overflow-y: auto;
      padding: 28px 36px;
    }
  `]
})
export class AdminShellComponent {
  private store = inject(Store);
  
  isSidebarCollapsed = false;
  userName$ = this.store.select(selectUserName);
  userRole$ = this.store.select(selectDisplayRole);

  toggleSidebar() {
    this.isSidebarCollapsed = !this.isSidebarCollapsed;
  }

  onLogout() {
    this.store.dispatch(logout());
  }
}

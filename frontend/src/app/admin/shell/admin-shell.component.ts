import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ContactService } from '../../core/services/contact.service';
import { I18nService } from '../../core/services/i18n.service';
import { ThemeService } from '../../core/services/theme.service';
import { LogoComponent } from '../../shared/components/logo/logo.component';
import { ToastComponent } from '../../shared/components/toast/toast.component';

interface AdminNavItem {
  path: string;
  label: string;
  exact: boolean;
  icon: string;
  badge?: number;
}

/**
 * Dashboard chrome: sidebar, top bar and the outlet every admin page renders
 * into. Collapses to a slide-over drawer below 980px.
 */
@Component({
  selector: 'app-admin-shell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, LogoComponent, ToastComponent],
  templateUrl: './admin-shell.component.html',
  styleUrl: './admin-shell.component.scss',
})
export class AdminShellComponent {
  protected readonly i18n = inject(I18nService);
  protected readonly theme = inject(ThemeService);
  protected readonly auth = inject(AuthService);
  private readonly contact = inject(ContactService);

  protected readonly drawerOpen = signal(false);
  protected readonly unread = signal(0);

  protected readonly themeLabel = computed(() =>
    this.theme.isDark() ? this.i18n.dict().nav.switchToLight : this.i18n.dict().nav.switchToDark,
  );

  protected readonly nav = computed<AdminNavItem[]>(() => {
    const dictionary = this.i18n.dict().admin.nav;
    return [
      { path: '/admin', label: dictionary.dashboard, exact: true, icon: 'grid' },
      { path: '/admin/machines', label: dictionary.machines, exact: false, icon: 'box' },
      { path: '/admin/categories', label: dictionary.categories, exact: false, icon: 'layers' },
      { path: '/admin/content', label: dictionary.content, exact: false, icon: 'text' },
      {
        path: '/admin/messages',
        label: dictionary.messages,
        exact: false,
        icon: 'mail',
        badge: this.unread(),
      },
      { path: '/admin/account', label: dictionary.account, exact: false, icon: 'user' },
    ];
  });

  protected readonly initials = computed(() => {
    const name = this.auth.user()?.name ?? '';
    return (
      name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() ?? '')
        .join('') || 'A'
    );
  });

  constructor() {
    // The unread badge is a small nicety, so a failure here is silent.
    this.contact.stats().subscribe({
      next: (stats) => this.unread.set(stats.messages.unread),
      error: () => undefined,
    });
  }

  protected toggleDrawer(): void {
    this.drawerOpen.update((open) => !open);
  }

  protected closeDrawer(): void {
    this.drawerOpen.set(false);
  }

  protected signOut(): void {
    this.auth.logout();
  }
}

import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ContactService } from '../../core/services/contact.service';
import { DashboardStats } from '../../core/models/auth.model';
import { I18nService } from '../../core/services/i18n.service';

@Component({
  selector: 'app-admin-dashboard',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
    <div class="admin-page">
      <header class="admin-head">
        <div>
          <h1 class="admin-title">{{ i18n.dict().admin.dashboard.title }}</h1>
          <p class="admin-subtitle">
            {{ i18n.dict().admin.dashboard.welcome }}, {{ auth.user()?.name }}
          </p>
        </div>

        <div class="admin-actions">
          <a class="btn btn--primary btn--small" routerLink="/admin/machines/new">
            {{ i18n.dict().admin.dashboard.addMachine }}
          </a>
          <a class="btn btn--ghost btn--small" routerLink="/admin/content">
            {{ i18n.dict().admin.dashboard.manageContent }}
          </a>
        </div>
      </header>

      @if (loading()) {
        <div class="admin-loading">
          <span></span><span></span><span></span>
        </div>
      } @else if (stats(); as data) {
        <!-- Tiles -->
        <div class="tiles">
          <a class="tile" routerLink="/admin/machines">
            <span class="tile__label">{{ i18n.dict().admin.dashboard.totalMachines }}</span>
            <span class="tile__value">{{ i18n.formatNumber(data.machines.total) }}</span>
            <span class="tile__foot">
              <span class="pill pill--on">
                {{ i18n.formatNumber(data.machines.published) }}
                {{ i18n.dict().admin.dashboard.published }}
              </span>
              @if (data.machines.drafts) {
                <span class="pill pill--off">
                  {{ i18n.formatNumber(data.machines.drafts) }}
                  {{ i18n.dict().admin.dashboard.drafts }}
                </span>
              }
            </span>
          </a>

          <a class="tile" routerLink="/admin/machines" [queryParams]="{ status: 'SOLD' }">
            <span class="tile__label">{{ i18n.dict().admin.dashboard.sold }}</span>
            <span class="tile__value">{{ i18n.formatNumber(data.machines.sold) }}</span>
            <span class="tile__foot muted">{{ i18n.dict().status.soldHint }}</span>
          </a>

          <a class="tile" routerLink="/admin/categories">
            <span class="tile__label">{{ i18n.dict().admin.dashboard.categories }}</span>
            <span class="tile__value">{{ i18n.formatNumber(data.categories) }}</span>
          </a>

          <a class="tile tile--accent" routerLink="/admin/messages">
            <span class="tile__label">{{ i18n.dict().admin.dashboard.unreadMessages }}</span>
            <span class="tile__value">{{ i18n.formatNumber(data.messages.unread) }}</span>
            <span class="tile__foot muted">
              {{ i18n.formatNumber(data.messages.total) }}
              {{ i18n.dict().admin.dashboard.totalMessages }}
            </span>
          </a>
        </div>

        <div class="panels">
          <!-- Recent enquiries -->
          <section class="admin-card">
            <h2 class="admin-card__title">{{ i18n.dict().admin.dashboard.recentMessages }}</h2>

            @if (data.recentMessages.length) {
              <ul class="list">
                @for (message of data.recentMessages; track message.id) {
                  <li>
                    <a class="row" routerLink="/admin/messages">
                      <span class="row__main">
                        <strong class="row__title">{{ message.subject }}</strong>
                        <span class="row__sub">{{ message.name }} · {{ message.email }}</span>
                      </span>
                      <span class="row__side">
                        @if (message.status === 'NEW') {
                          <span class="pill pill--info">
                            {{ i18n.dict().admin.messages.statuses.NEW }}
                          </span>
                        }
                        <time class="row__time">{{ i18n.formatDate(message.createdAt) }}</time>
                      </span>
                    </a>
                  </li>
                }
              </ul>
            } @else {
              <p class="muted">{{ i18n.dict().admin.dashboard.noMessages }}</p>
            }
          </section>

          <!-- Most viewed -->
          <section class="admin-card">
            <h2 class="admin-card__title">{{ i18n.dict().admin.dashboard.topViewed }}</h2>

            @if (data.topViewed.length) {
              <ul class="list">
                @for (machine of data.topViewed; track machine.id) {
                  <li>
                    <a class="row" [routerLink]="['/admin/machines', machine.id]">
                      <span class="row__main">
                        <strong class="row__title">{{ i18n.localize(machine, 'name') }}</strong>
                        <span class="row__sub">{{ machine.slug }}</span>
                      </span>
                      <span class="row__views">
                        {{ i18n.formatNumber(machine.viewCount) }}
                        <small>{{ i18n.dict().machine.viewsLabel }}</small>
                      </span>
                    </a>
                  </li>
                }
              </ul>
            } @else {
              <p class="muted">{{ i18n.dict().common.empty }}</p>
            }
          </section>
        </div>
      } @else {
        <div class="admin-empty">
          <p class="admin-empty__title">{{ i18n.dict().common.error }}</p>
          <p class="admin-empty__body">{{ i18n.dict().common.errorBody }}</p>
          <button type="button" class="btn btn--primary btn--small" (click)="load()">
            {{ i18n.dict().common.retry }}
          </button>
        </div>
      }
    </div>
  `,
  styles: `
    .tiles {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
      margin-bottom: 1.5rem;
    }

    .tile {
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
      padding: 1.25rem;
      background: var(--ink-850);
      border: 1px solid var(--line);
      border-radius: var(--radius);
      transition:
        border-color var(--dur-fast) var(--ease),
        transform var(--dur-fast) var(--ease);

      &:hover {
        border-color: var(--blue);
        transform: translateY(-2px);
      }
    }

    .tile--accent {
      background: linear-gradient(150deg, rgba(0, 123, 255, 0.12), var(--ink-850) 65%);
      border-color: rgba(0, 123, 255, 0.3);
    }

    .tile__label {
      font-family: var(--font-mono);
      font-size: 0.6875rem;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: var(--text-mute);
    }

    .tile__value {
      font-family: var(--font-display);
      font-size: 2.25rem;
      font-weight: 700;
      line-height: 1;
      color: var(--fg-strong);
    }

    .tile__foot {
      display: flex;
      flex-wrap: wrap;
      gap: 0.35rem;
      margin-top: 0.35rem;
      font-size: 0.75rem;
    }

    .panels {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
      gap: 1rem;
    }

    .list {
      list-style: none;
      padding: 0;
      display: flex;
      flex-direction: column;
    }

    .row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      padding: 0.75rem 0;
      border-bottom: 1px solid var(--line);
      transition: color var(--dur-fast) var(--ease);

      &:hover .row__title {
        color: var(--blue-bright);
      }
    }

    .list li:last-child .row {
      border-bottom: 0;
      padding-bottom: 0;
    }

    .row__main {
      display: flex;
      flex-direction: column;
      gap: 0.15rem;
      min-width: 0;
    }

    .row__title {
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--text);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      transition: color var(--dur-fast) var(--ease);
    }

    .row__sub {
      font-size: 0.75rem;
      color: var(--text-mute);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .row__side {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      flex-shrink: 0;
    }

    .row__time {
      font-size: 0.75rem;
      color: var(--text-mute);
      white-space: nowrap;
    }

    .row__views {
      font-family: var(--font-mono);
      font-size: 0.875rem;
      color: var(--blue-bright);
      white-space: nowrap;

      small {
        color: var(--text-mute);
        font-size: 0.6875rem;
      }
    }
  `,
})
export class AdminDashboardComponent {
  protected readonly i18n = inject(I18nService);
  protected readonly auth = inject(AuthService);
  private readonly contact = inject(ContactService);

  protected readonly stats = signal<DashboardStats | null>(null);
  protected readonly loading = signal(true);

  constructor() {
    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    this.contact.stats().subscribe({
      next: (data) => {
        this.stats.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.stats.set(null);
        this.loading.set(false);
      },
    });
  }
}

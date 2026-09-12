import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/guards/auth.guard';

/**
 * Every page is lazily loaded. That keeps the initial bundle to the shell plus
 * the home page, and means the admin area — which carries the heaviest forms —
 * is never downloaded by a visitor who only browses the catalogue.
 */
export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/home/home.component').then((m) => m.HomeComponent),
    title: 'Rashidy Import & Export',
  },
  {
    path: 'machines',
    loadComponent: () =>
      import('./pages/machinery/machinery.component').then((m) => m.MachineryComponent),
  },
  {
    // SEO-friendly detail URL, e.g. /machines/plastic-injection-molding-machine
    path: 'machines/:slug',
    loadComponent: () =>
      import('./pages/machine-detail/machine-detail.component').then(
        (m) => m.MachineDetailComponent,
      ),
  },
  {
    path: 'about',
    loadComponent: () =>
      import('./pages/about-contact/about-contact.component').then((m) => m.AboutContactComponent),
  },

  // --- Admin ---------------------------------------------------------------
  {
    path: 'admin/login',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./admin/login/admin-login.component').then((m) => m.AdminLoginComponent),
  },
  {
    path: 'admin',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./admin/shell/admin-shell.component').then((m) => m.AdminShellComponent),
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./admin/dashboard/admin-dashboard.component').then(
            (m) => m.AdminDashboardComponent,
          ),
      },
      {
        path: 'machines',
        loadComponent: () =>
          import('./admin/machines/admin-machines.component').then((m) => m.AdminMachinesComponent),
      },
      {
        path: 'machines/new',
        loadComponent: () =>
          import('./admin/machine-form/admin-machine-form.component').then(
            (m) => m.AdminMachineFormComponent,
          ),
      },
      {
        path: 'machines/:id',
        loadComponent: () =>
          import('./admin/machine-form/admin-machine-form.component').then(
            (m) => m.AdminMachineFormComponent,
          ),
      },
      {
        path: 'categories',
        loadComponent: () =>
          import('./admin/categories/admin-categories.component').then(
            (m) => m.AdminCategoriesComponent,
          ),
      },
      {
        path: 'content',
        loadComponent: () =>
          import('./admin/content/admin-content.component').then((m) => m.AdminContentComponent),
      },
      {
        path: 'messages',
        loadComponent: () =>
          import('./admin/messages/admin-messages.component').then((m) => m.AdminMessagesComponent),
      },
      {
        path: 'account',
        loadComponent: () =>
          import('./admin/account/admin-account.component').then((m) => m.AdminAccountComponent),
      },
    ],
  },

  {
    path: '**',
    loadComponent: () =>
      import('./pages/not-found/not-found.component').then((m) => m.NotFoundComponent),
  },
];

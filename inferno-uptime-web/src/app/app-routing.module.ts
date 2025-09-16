// src/app/app-routing.module.ts
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { MonitorsComponent } from './components/monitors/monitors.component';

export const routes: Routes = [
  { path: '', redirectTo: '/dashboard', pathMatch: 'full' },
  { path: 'dashboard', component: DashboardComponent },
  { path: 'monitors', component: MonitorsComponent },
  { 
    path: 'monitors/:id', 
    loadComponent: () => import('./components/monitor-details/monitor-details.component').then(m => m.MonitorDetailsComponent)
  },
  { 
    path: 'incidents', 
    loadComponent: () => import('./components/incidents/incidents.component').then(m => m.IncidentsComponent)
  },
  { 
    path: 'reports', 
    loadComponent: () => import('./components/reports/reports.component').then(m => m.ReportsComponent)
  },
  { 
    path: 'settings', 
    loadComponent: () => import('./components/settings/settings.component').then(m => m.SettingsComponent)
  },
  { path: '**', redirectTo: '/dashboard' }
];
@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
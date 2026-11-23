import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { Dashboard } from './dashboard/dashboard';
import { DashboardRoutingModule } from './dashboard-routing-module';

@NgModule({ declarations: [Dashboard], imports: [CommonModule, MatButtonModule, MatCardModule, MatIconModule, MatProgressBarModule, DashboardRoutingModule] })
export class DashboardModule {}

import { Component, inject, OnInit, signal } from '@angular/core';
import { IndicadoresDashboard } from '../../core/models/dashboard';
import { DashboardApi } from '../../core/services/dashboard-api';

@Component({
  selector: 'app-dashboard',
  standalone: false,
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard implements OnInit {
  private readonly api = inject(DashboardApi);
  protected readonly dados = signal<IndicadoresDashboard | null>(null);
  protected readonly carregando = signal(true);
  protected readonly erro = signal(false);

  ngOnInit(): void { this.carregar(); }

  carregar(): void {
    this.carregando.set(true);
    this.erro.set(false);
    this.api.consultar().subscribe({
      next: (dados) => { this.dados.set(dados); this.carregando.set(false); },
      error: () => { this.erro.set(true); this.carregando.set(false); },
    });
  }
}

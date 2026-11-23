import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { authGuard } from '../core/guards/auth-guard';
import { Layout } from './layout/layout';

// Páginas que aparecem dentro do cabeçalho e do rodapé.
const routes: Routes = [
  {
    path: '',
    component: Layout,
    children: [
      {
        path: 'clientes',
        loadChildren: () => import('../clientes/clientes-module').then((m) => m.ClientesModule),
      },
      // Detalhe público: o login só é pedido ao clicar em "Solicitar serviço".
      {
        path: 'servicos',
        loadChildren: () => import('../servicos/servicos-module').then((m) => m.ServicosModule),
      },
      {
        path: 'tornar-prestador',
        canActivate: [authGuard],
        loadChildren: () => import('../tornar-prestador/tornar-prestador-module').then((m) => m.TornarPrestadorModule),
      },
      {
        path: 'minha-conta',
        canActivate: [authGuard],
        loadChildren: () => import('../minha-conta/minha-conta-module').then((m) => m.MinhaContaModule),
      },
      {
        path: 'gestao-categorias',
        canActivate: [authGuard],
        loadChildren: () => import('../gestao-categorias/gestao-categorias-module').then((m) => m.GestaoCategoriasModule),
      },
      {
        path: 'minha-disponibilidade',
        canActivate: [authGuard],
        loadChildren: () => import('../minha-disponibilidade/minha-disponibilidade-module').then((m) => m.MinhaDisponibilidadeModule),
      },
      {
        path: 'meus-servicos',
        canActivate: [authGuard],
        loadChildren: () => import('../meus-servicos/meus-servicos-module').then((m) => m.MeusServicosModule),
      },
      {
        path: 'dashboard',
        canActivate: [authGuard],
        loadChildren: () => import('../dashboard/dashboard-module').then((m) => m.DashboardModule),
      },
      {
        path: 'pedidos',
        canActivate: [authGuard],
        loadChildren: () => import('../pedidos/pedidos-module').then((m) => m.PedidosModule),
      },
      {
        path: '',
        loadChildren: () => import('../home/home-module').then((m) => m.HomeModule),
      },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class LayoutRoutingModule {}

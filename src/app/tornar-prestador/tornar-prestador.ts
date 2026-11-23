import { Component, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Categoria } from '../core/models/categoria';
import { TipoCobranca } from '../core/models/servico';
import { CategoriaApi } from '../core/services/categoria-api';
import { Prestador } from '../core/services/prestador';
@Component({selector:'app-tornar-prestador',standalone:false,templateUrl:'./tornar-prestador.html',styleUrl:'./tornar-prestador.scss'})
export class TornarPrestador implements OnInit {
 private readonly prestador=inject(Prestador);private readonly categoriasApi=inject(CategoriaApi);private readonly router=inject(Router);
 protected readonly categorias=signal<Categoria[]>([]);protected readonly erro=signal('');protected biografia='';protected raioAtendimentoKm=20;protected titulo='';protected descricao='';protected preco:number|null=null;protected categoriaId:number|null=null;protected subcategoriaId:number|null=null;protected tipoCobranca:TipoCobranca='POR_TRABALHO';
 protected get subcategorias(){return this.categorias().find(c=>c.id===this.categoriaId)?.subcategorias??[]}
 ngOnInit(){this.categoriasApi.listar().subscribe({next:c=>this.categorias.set(c)});this.prestador.verificar().subscribe({next:eh=>{if(eh)this.router.navigate(['/meus-servicos'])}})}
 enviar(){this.erro.set('');if(!this.titulo.trim()||!this.descricao.trim()||!this.categoriaId||!this.subcategoriaId||!this.preco||this.preco<=0){this.erro.set('Preencha os dados do perfil e do primeiro serviço.');return}this.prestador.tornarPrestador({biografia:this.biografia,raioAtendimentoKm:this.raioAtendimentoKm,servico:{categoriaId:this.categoriaId,subcategoriaId:this.subcategoriaId,titulo:this.titulo.trim(),descricao:this.descricao.trim(),preco:this.preco,tipoCobranca:this.tipoCobranca}}).subscribe({next:()=>this.router.navigate(['/meus-servicos']),error:()=>this.erro.set('Não foi possível criar seu perfil. Confira os dados e tente novamente.')})}
}

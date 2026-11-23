import { Component, inject, OnInit, signal } from '@angular/core';
import { Categoria } from '../core/models/categoria';
import { CategoriaApi } from '../core/services/categoria-api';
@Component({selector:'app-gestao-categorias',standalone:false,templateUrl:'./gestao-categorias.html',styleUrl:'./gestao-categorias.scss'})
export class GestaoCategorias implements OnInit {
 private readonly api=inject(CategoriaApi); protected readonly categorias=signal<Categoria[]>([]); protected readonly erro=signal(''); protected readonly editId=signal<number|null>(null); protected readonly categoriaSelecionada=signal<number|null>(null);
 protected nome=''; protected descricao=''; protected subNome=''; protected subDescricao=''; protected subEditId:number|null=null;
 protected get categoriaAtual(): Categoria | undefined { const id=this.categoriaSelecionada(); return this.categorias().find(c=>c.id===id); }
 ngOnInit(){this.carregar()}
 carregar(){this.api.listar().subscribe({next:v=>{this.categorias.set(v);if(!this.categoriaSelecionada()&&v.length)this.categoriaSelecionada.set(v[0].id)},error:()=>this.erro.set('Não foi possível carregar as categorias.')})}
 editar(c:Categoria){this.editId.set(c.id);this.nome=c.nome;this.descricao=c.descricao??''}
 limpar(){this.editId.set(null);this.nome='';this.descricao=''}
 salvar(){this.erro.set('');const d={nome:this.nome.trim(),descricao:this.descricao.trim()};if(!d.nome){this.erro.set('Informe o nome da categoria.');return}const id=this.editId();(id?this.api.atualizar(id,d):this.api.criar(d)).subscribe({next:()=>{this.limpar();this.carregar()},error:()=>this.erro.set('Não foi possível salvar. Verifique se já existe categoria com esse nome.')})}
 excluir(id:number){if(!confirm('Deseja inativar esta categoria?'))return;this.api.excluir(id).subscribe({next:()=>this.carregar(),error:()=>this.erro.set('Não foi possível inativar a categoria.')})}
 salvarSubcategoria(){const id=this.categoriaSelecionada();if(!id||!this.subNome.trim()){this.erro.set('Selecione uma categoria e informe o nome da subcategoria.');return}const dados={nome:this.subNome.trim(),descricao:this.subDescricao.trim()};const chamada=this.subEditId?this.api.atualizarSubcategoria(id,this.subEditId,{...dados,status:'ATIVA'}):this.api.criarSubcategoria(id,dados);chamada.subscribe({next:()=>{this.subNome='';this.subDescricao='';this.subEditId=null;this.carregar()},error:()=>this.erro.set('Não foi possível salvar a subcategoria. Prestadores e administradores podem criar subcategorias.')})}
 editarSubcategoria(id:number,nome:string,descricao:string|null){this.subEditId=id;this.subNome=nome;this.subDescricao=descricao??''}
 excluirSubcategoria(id:number){const categoria=this.categoriaSelecionada();if(!categoria||!confirm('Deseja inativar esta subcategoria?'))return;this.api.excluirSubcategoria(categoria,id).subscribe({next:()=>this.carregar(),error:()=>this.erro.set('Não foi possível inativar a subcategoria.')})}
}

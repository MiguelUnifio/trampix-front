import { Component, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Auth } from '../core/services/auth';
import { UsuarioApi } from '../core/services/usuario-api';
import { TipoDocumento } from '../core/models/usuario';
@Component({selector:'app-minha-conta',standalone:false,templateUrl:'./minha-conta.html',styleUrl:'./minha-conta.scss'})
export class MinhaConta implements OnInit {
 private readonly auth=inject(Auth);private readonly api=inject(UsuarioApi);private readonly router=inject(Router);
 protected readonly erro=signal('');protected readonly sucesso=signal('');
 protected nome='';protected email='';protected documento='';protected tipoDocumento:TipoDocumento='CPF';protected telefone='';protected dataNascimento='';protected cep='';protected logradouro='';protected numero='';protected complemento='';protected bairro='';protected cidade='';protected uf='';protected senha='';
 ngOnInit(){const u=this.auth.usuario();if(!u){this.router.navigate(['/login']);return;}this.nome=u.nome;this.email=u.email;this.documento=u.documento??'';this.tipoDocumento=u.tipoDocumento??'CPF';this.telefone=u.telefone??'';this.dataNascimento=u.dataNascimento??'';this.cep=u.cep??'';this.logradouro=u.logradouro??'';this.numero=u.numero??'';this.complemento=u.complemento??'';this.bairro=u.bairro??'';this.cidade=u.cidade??'';this.uf=u.uf??'';}
 salvar(){const u=this.auth.usuario();if(!u)return;this.erro.set('');this.sucesso.set('');const dados:any={nome:this.nome,email:this.email,documento:this.documento,tipoDocumento:this.tipoDocumento,telefone:this.telefone||null,dataNascimento:this.dataNascimento||null,cep:this.cep||null,logradouro:this.logradouro||null,numero:this.numero||null,complemento:this.complemento||null,bairro:this.bairro||null,cidade:this.cidade||null,uf:this.uf.trim().toUpperCase()||null};if(this.senha.trim())dados.senha=this.senha;this.api.atualizar(u.id,dados).subscribe({next:res=>{this.auth.atualizarUsuario(res);this.senha='';this.sucesso.set('Seus dados foram atualizados.');},error:()=>this.erro.set('Não foi possível atualizar. Confira os dados e se o e-mail já está em uso.')});}
 excluir(){const u=this.auth.usuario();if(!u||!confirm('Deseja realmente desativar sua conta? Esta ação encerra seu acesso.'))return;this.api.excluir(u.id).subscribe({next:()=>{this.auth.logout();this.router.navigate(['/']);},error:()=>this.erro.set('Não foi possível desativar a conta.')});}
}

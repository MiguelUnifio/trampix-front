import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MeusServicos } from './meus-servicos';
@NgModule({ declarations:[MeusServicos], imports:[CommonModule,FormsModule,RouterModule.forChild([{path:'',component:MeusServicos}]),MatButtonModule,MatCardModule,MatFormFieldModule,MatIconModule,MatInputModule,MatSelectModule] })
export class MeusServicosModule {}

import {
  Component,
  OnInit,
  ViewEncapsulation,
  ChangeDetectionStrategy,
} from '@angular/core';
import { ICellRendererParams } from 'ag-grid-community';
import { ICellRendererAngularComp } from 'ag-grid-angular';
import { MaterialModule } from '../material.module';
import { CommonModule } from '@angular/common';

export interface AdminActionRendererParams extends ICellRendererParams {
  viewClick: (data: any) => void;
  editClick: (data: any) => void;
  deleteClick: (data: any) => void;
  playClick: (data: any) => void;
  addClick: (data: any) => void;
  showPlay: boolean;
  showAdd: boolean;
}

@Component({
  selector: 'app-admin-action',
  template: `
    <span class="row">
      <button *ngIf="params?.showPlay" mat-icon-button color="primary" matTooltip="Play" (click)="play()">
        <mat-icon class="sm-icon">play_arrow</mat-icon>
      </button>
      <button *ngIf="params?.showAdd" mat-icon-button color="primary" matTooltip="Add" (click)="add()">
        <mat-icon class="sm-icon">add</mat-icon>
      </button>
      <button *ngIf="!params || !params.data || (!!params.data && !!params.viewClick)" mat-icon-button aria-label="View" class="table-action" color="primary" matToolTip="View" (click)="view()">
        <mat-icon class="sm-icon">visibility</mat-icon>
      </button>
      <button *ngIf="!params || !params.data || (!!params.data && !!params.editClick)" mat-icon-button aria-label="Edit" class="table-action" color="primary" matToolTip="Edit" (click)="edit()">
        <mat-icon class="sm-icon">edit</mat-icon>
      </button>
      <button *ngIf="!params || !params.data || (!!params.data && !!params.deleteClick)" mat-icon-button aria-label="Delete" class="table-action" color="primary" matToolTip="Delete" (click)="delete()">
        <mat-icon class="sm-icon">delete</mat-icon>
      </button>
    </span>
  `,
  styles: [`
    .row {
      display: flex;
      height: 100%;
      width: 100%;
      flex-wrap: nowrap;
      min-width: 80px; /* Reduced from 120px */
      align-items: center;
      justify-content: flex-start; /* Changed from center to start */
      gap: 2px; /* Add small gap between buttons */
    }
    
    .table-action {
      margin: 0;
      padding: 0;
      min-width: 28px !important; /* Reduced from 32px */
      height: 28px; /* Reduced from 32px */
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      background-color: transparent;
      box-shadow: none;
      transition: background-color 0.2s ease;
    }
    
    .table-action:hover {
      background-color: rgba(0, 0, 0, 0.04);
    }
    
    .table-action[color="warn"]:hover {
      background-color: rgba(244, 67, 54, 0.04);
    }
    
    .sm-icon {
      font-size: 18px !important; /* Reduced from 22px */
      height: 16px; /* Reduced from 18px */
      color: rgb(121, 86, 84);
    }
    
    .table-action[color="warn"] .sm-icon {
      color: #f44336;
    }
  `],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, MaterialModule]
})
export class AdminActionsComponent implements ICellRendererAngularComp {
  params?: AdminActionRendererParams;
  
  constructor() {}
  
  agInit(params: AdminActionRendererParams): void {
    this.params = params;
  }
  
  refresh(params: AdminActionRendererParams): boolean {
    this.params = params;
    return true;
  }
  
  view() {
    this.params?.viewClick(this.params?.data);
  }
  
  edit() {
    this.params?.editClick(this.params?.data);
  }
  
  delete() {
    this.params?.deleteClick(this.params?.data);
  }
  
  play() {
    this.params?.playClick(this.params?.data);
  }
  
  add() {
    this.params?.addClick(this.params?.data);
  }
}
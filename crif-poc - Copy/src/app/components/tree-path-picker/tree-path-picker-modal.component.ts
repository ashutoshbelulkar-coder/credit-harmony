import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TreePathNode } from '../../models/schema-node.model';
import { TreePathNodeComponent } from './tree-path-node.component';

@Component({
  selector: 'app-tree-path-picker-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, TreePathNodeComponent],
  templateUrl: './tree-path-picker-modal.component.html',
  styleUrls: ['./tree-path-picker-modal.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TreePathPickerModalComponent {
  @Input() treeNodes: TreePathNode[] = [];
  @Input() currentPath: string = '';
  @Input() isOpen: boolean = false;
  @Output() pathSelected = new EventEmitter<string>();
  @Output() close = new EventEmitter<void>();
  @Output() manualPathChange = new EventEmitter<string>();

  manualPath: string = '';
  expandedNodes = new Set<string>();

  ngOnChanges(): void {
    if (this.isOpen) {
      this.manualPath = this.currentPath;
    }
  }

  toggleNode(node: TreePathNode): void {
    const hasChildren = Array.isArray(node.children) && node.children.length > 0;
    if (!hasChildren) {
      return;
    }

    if (this.expandedNodes.has(node.fullPath)) {
      this.expandedNodes.delete(node.fullPath);
    } else {
      this.expandedNodes.add(node.fullPath);
    }
  }

  isExpanded(node: TreePathNode): boolean {
    return this.expandedNodes.has(node.fullPath);
  }

  selectPath(path: string): void {
    this.pathSelected.emit(path);
    this.closeModal();
  }

  selectManualPath(): void {
    if (this.manualPath.trim()) {
      this.manualPathChange.emit(this.manualPath.trim());
      this.closeModal();
    }
  }

  closeModal(): void {
    this.close.emit();
  }

  onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.closeModal();
    }
  }
}

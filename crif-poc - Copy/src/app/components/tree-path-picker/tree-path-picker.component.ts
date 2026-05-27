import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TreePathNode } from '../../models/schema-node.model';
import { TreePathNodeComponent } from './tree-path-node.component';

@Component({
  selector: 'app-tree-path-picker',
  standalone: true,
  imports: [CommonModule, FormsModule, TreePathNodeComponent],
  templateUrl: './tree-path-picker.component.html',
  styleUrls: ['./tree-path-picker.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TreePathPickerComponent {
  @Input() treeNodes: TreePathNode[] = [];
  @Input() manualPath: string = '';
  @Output() pathSelected = new EventEmitter<string>();
  @Output() manualPathChange = new EventEmitter<string>();

  expandedNodes = new Set<string>();

  toggleNode(node: TreePathNode): void {
    if (!node.isLeaf) {
      if (this.expandedNodes.has(node.fullPath)) {
        this.expandedNodes.delete(node.fullPath);
      } else {
        this.expandedNodes.add(node.fullPath);
      }
    }
  }

  isExpanded(node: TreePathNode): boolean {
    return this.expandedNodes.has(node.fullPath);
  }

  selectPath(path: string): void {
    this.pathSelected.emit(path);
  }

  onManualPathChange(value: string): void {
    this.manualPathChange.emit(value);
  }
}

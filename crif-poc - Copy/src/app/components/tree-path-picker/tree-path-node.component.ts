import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TreePathNode } from '../../models/schema-node.model';

@Component({
  selector: 'app-tree-path-node',
  standalone: true,
  imports: [CommonModule, TreePathNodeComponent],
  templateUrl: './tree-path-node.component.html',
  styleUrls: ['./tree-path-node.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TreePathNodeComponent {
  @Input() node!: TreePathNode;
  @Input() depth: number = 0;
  @Input() expandedNodes: Set<string> = new Set<string>();
  @Input() showSelectButton = true;
  @Output() toggle = new EventEmitter<TreePathNode>();
  @Output() selectPath = new EventEmitter<string>();

  onToggle(event: Event): void {
    event.stopPropagation();
    this.toggle.emit(this.node);
  }

  onHeaderClick(event: Event): void {
    if (!this.hasChildren) {
      return;
    }
    this.onToggle(event);
  }

  onSelectPath(path: string, event: Event): void {
    event.stopPropagation();
    this.selectPath.emit(path);
  }

  onChildSelectPath(path: string): void {
    this.selectPath.emit(path);
  }

  onChildToggle(node: TreePathNode): void {
    this.toggle.emit(node);
  }

  get indentStyle(): { marginLeft: string } {
    return { marginLeft: `${this.depth * 20}px` };
  }

  get hasChildren(): boolean {
    return this.node.children && this.node.children.length > 0;
  }

  get isExpanded(): boolean {
    return this.expandedNodes.has(this.node.fullPath);
  }

  get nodeIcon(): string {
    if (this.node.isArray) {
      return '📚';
    }
    return this.node.isLeaf ? '📄' : '📁';
  }
}

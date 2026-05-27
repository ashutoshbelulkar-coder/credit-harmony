import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SchemaService } from '../../services/schema.service';
import { TreePathNode } from '../../models/schema-node.model';

interface MasterTreeItem {
  node: TreePathNode;
  children: MasterTreeItem[];
  matchesSearch: boolean;
}

@Component({
  selector: 'app-master-model-tree',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './master-model-tree.component.html',
  styleUrls: ['./master-model-tree.component.scss']
})
export class MasterModelTreeComponent implements OnInit {
  masterPathTree: TreePathNode[] = [];
  filteredNodes: MasterTreeItem[] = [];
  expandedNodeIds: Set<string> = new Set();
  selectedNodePath: string | null = null;
  searchQuery = '';
  pendingDeleteNode: TreePathNode | null = null;

  constructor(private schemaService: SchemaService) {}

  ngOnInit(): void {
    this.schemaService.masterPathTree$.subscribe(tree => {
      this.masterPathTree = tree;
      this.refreshTreeView();
    });

    this.schemaService.selectedMasterNode$.subscribe(node => {
      this.selectedNodePath = node?.fullPath ?? null;
    });
  }

  selectNode(node: TreePathNode): void {
    this.schemaService.selectMasterNode(node.fullPath);
  }

  onSearchQueryChange(): void {
    this.refreshTreeView();
  }

  clearSearch(): void {
    if (!this.searchQuery) {
      return;
    }

    this.searchQuery = '';
    this.refreshTreeView();
  }

  expandAll(): void {
    this.expandedNodeIds = this.collectExpandableNodeIds(this.filteredNodes);
  }

  collapseAll(): void {
    this.expandedNodeIds.clear();
  }

  toggleNode(nodePath: string): void {
    const expandedNodes = new Set(this.expandedNodeIds);

    if (expandedNodes.has(nodePath)) {
      expandedNodes.delete(nodePath);
    } else {
      expandedNodes.add(nodePath);
    }

    this.expandedNodeIds = expandedNodes;
  }

  isExpanded(nodePath: string): boolean {
    return this.expandedNodeIds.has(nodePath);
  }

  addRootField(): void {
    this.schemaService.addMasterNode(null, 'FIELD');
  }

  addRootObject(): void {
    this.schemaService.addMasterNode(null, 'OBJECT');
  }

  addRootArray(): void {
    this.schemaService.addMasterNode(null, 'ARRAY');
  }

  addField(node: TreePathNode): void {
    this.schemaService.addMasterNode(node.fullPath, 'FIELD');
    this.expandedNodeIds.add(node.fullPath);
  }

  addObject(node: TreePathNode): void {
    this.schemaService.addMasterNode(node.fullPath, 'OBJECT');
    this.expandedNodeIds.add(node.fullPath);
  }

  addArray(node: TreePathNode): void {
    this.schemaService.addMasterNode(node.fullPath, 'ARRAY');
    this.expandedNodeIds.add(node.fullPath);
  }

  requestDeleteNode(node: TreePathNode): void {
    this.pendingDeleteNode = node;
  }

  cancelDeleteNode(): void {
    this.pendingDeleteNode = null;
  }

  confirmDeleteNode(): void {
    if (!this.pendingDeleteNode) {
      return;
    }

    this.schemaService.deleteMasterNode(this.pendingDeleteNode.fullPath);
    this.expandedNodeIds.delete(this.pendingDeleteNode.fullPath);
    this.pendingDeleteNode = null;
  }

  canAddChildren(node: TreePathNode): boolean {
    return this.schemaService.canAddChildrenToMasterNode(node);
  }

  canDeleteNode(node: TreePathNode): boolean {
    return node.key !== '[*]';
  }

  showChildActions(node: TreePathNode): boolean {
    return this.canAddChildren(node) && (this.isExpanded(node.fullPath) || node.key === '[*]' || this.selectedNodePath === node.fullPath);
  }

  isArrayContainer(node: TreePathNode): boolean {
    return node.children.some(child => child.key === '[*]');
  }

  getNodeBadge(node: TreePathNode): string {
    if (node.key === '[*]' || this.isArrayContainer(node)) {
      return '[]';
    }

    if (!node.isLeaf) {
      return '{}';
    }

    return 'F';
  }

  getNodeBadgeClass(node: TreePathNode): string {
    if (node.key === '[*]' || this.isArrayContainer(node)) {
      return 'array-icon';
    }

    return node.isLeaf ? 'field-icon' : 'object-icon';
  }

  trackTreeItem(_: number, item: MasterTreeItem): string {
    return item.node.fullPath;
  }

  private refreshTreeView(): void {
    const query = this.searchQuery.trim().toLowerCase();
    this.filteredNodes = this.buildTreeItems(this.masterPathTree, query);

    if (query) {
      this.expandedNodeIds = this.collectExpandableNodeIds(this.filteredNodes);
    }
  }

  private buildTreeItems(nodes: TreePathNode[], query: string): MasterTreeItem[] {
    return nodes
      .map(node => this.buildTreeItem(node, query))
      .filter((node): node is MasterTreeItem => node !== null);
  }

  private buildTreeItem(node: TreePathNode, query: string): MasterTreeItem | null {
    const children = this.buildTreeItems(node.children, query);
    const matchesSearch = !query || this.matchesNode(node, query);

    if (query && !matchesSearch && children.length === 0) {
      return null;
    }

    return {
      node,
      children,
      matchesSearch
    };
  }

  private matchesNode(node: TreePathNode, query: string): boolean {
    return node.key.toLowerCase().includes(query) || node.fullPath.toLowerCase().includes(query);
  }

  private collectExpandableNodeIds(nodes: MasterTreeItem[]): Set<string> {
    const expandedIds = new Set<string>();

    const visit = (items: MasterTreeItem[]): void => {
      items.forEach(item => {
        if (item.children.length > 0) {
          expandedIds.add(item.node.fullPath);
          visit(item.children);
        }
      });
    };

    visit(nodes);
    return expandedIds;
  }
}
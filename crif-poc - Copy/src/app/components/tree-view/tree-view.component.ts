import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SchemaService } from '../../services/schema.service';
import { SchemaNode, Datasource } from '../../models/schema-node.model';

interface TreeViewItem {
  node: SchemaNode;
  children: TreeViewItem[];
  matchesSearch: boolean;
}

interface TreeViewDatasource {
  datasource: Datasource;
  nodes: TreeViewItem[];
  totalNodes: number;
  visibleNodes: number;
}

@Component({
  selector: 'app-tree-view',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './tree-view.component.html',
  styleUrls: ['./tree-view.component.scss']
})
export class TreeViewComponent implements OnInit {
  datasources: Datasource[] = [];
  filteredDatasources: TreeViewDatasource[] = [];
  selectedNodeId: string | null = null;
  expandedNodeIds: Set<string> = new Set();
  pendingDeleteNode: SchemaNode | null = null;
  searchQuery = '';
  totalNodeCount = 0;
  visibleNodeCount = 0;
  visibleDatasourceCount = 0;

  constructor(private schemaService: SchemaService) {}

  ngOnInit(): void {
    this.schemaService.datasources$.subscribe(datasources => {
      this.datasources = datasources;
      this.refreshTreeView();
    });

    this.schemaService.selectedNode$.subscribe(node => {
      this.selectedNodeId = node?.id ?? null;
    });
  }

  selectNode(node: SchemaNode): void {
    this.selectedNodeId = node.id;
    this.schemaService.selectNode(node);
  }

  toggleNode(nodeId: string): void {
    if (this.expandedNodeIds.has(nodeId)) {
      this.expandedNodeIds.delete(nodeId);
    } else {
      this.expandedNodeIds.add(nodeId);
    }
  }

  isExpanded(nodeId: string): boolean {
    return this.expandedNodeIds.has(nodeId);
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
    this.expandedNodeIds = this.collectExpandableNodeIds(this.filteredDatasources);
  }

  collapseAll(): void {
    this.expandedNodeIds.clear();
  }

  exportProfile(): void {
    const json = this.schemaService.exportProfileJson();
    const blob = new Blob([json], { type: 'application/json' });
    const downloadUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = downloadUrl;
    link.download = `schema-profile-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(downloadUrl);
  }

  canHaveChildren(node: SchemaNode): boolean {
    return this.schemaService.canHaveChildren(node);
  }

  showChildActions(node: SchemaNode): boolean {
    return this.canHaveChildren(node) && (this.isExpanded(node.id) || this.selectedNodeId === node.id);
  }

  addField(parent: SchemaNode): void {
    const newNode: SchemaNode = {
      id: `${parent.id}-${Date.now()}`,
      name: this.schemaService.getUniqueNodeName(parent.children, 'New Field'),
      code: 'NEW_FIELD',
      nodeType: 'FIELD',
      dataType: 'STRING',
      sourceMapping: '',
      destinationMapping: '',
      validations: [],
      businessRules: [],
      transformations: [],
      children: []
    };
    this.schemaService.addChild(parent, newNode);
    this.expandedNodeIds.add(parent.id);
  }

  addObject(parent: SchemaNode): void {
    const newNode: SchemaNode = {
      id: `${parent.id}-${Date.now()}`,
      name: this.schemaService.getUniqueNodeName(parent.children, 'New Object'),
      code: 'NEW_OBJECT',
      nodeType: 'OBJECT',
      dataType: 'OBJECT',
      sourceMapping: '',
      destinationMapping: '',
      validations: [],
      businessRules: [],
      transformations: [],
      children: []
    };
    this.schemaService.addChild(parent, newNode);
    this.expandedNodeIds.add(parent.id);
  }

  addArray(parent: SchemaNode): void {
    const newNode: SchemaNode = {
      id: `${parent.id}-${Date.now()}`,
      name: this.schemaService.getUniqueNodeName(parent.children, 'New Array'),
      code: 'NEW_ARRAY',
      nodeType: 'ARRAY',
      dataType: 'ARRAY',
      sourceMapping: '',
      destinationMapping: '',
      validations: [],
      businessRules: [],
      transformations: [],
      children: []
    };
    this.schemaService.addChild(parent, newNode);
    this.expandedNodeIds.add(parent.id);
  }

  addRootField(datasource: Datasource): void {
    const newNode: SchemaNode = {
      id: `root-${Date.now()}`,
      name: this.schemaService.getUniqueNodeName(datasource.nodes, 'New Field'),
      code: 'NEW_FIELD',
      nodeType: 'FIELD',
      dataType: 'STRING',
      sourceMapping: '',
      destinationMapping: '',
      validations: [],
      businessRules: [],
      transformations: [],
      children: []
    };
    datasource.nodes.push(newNode);
    this.schemaService.updateNode(newNode);
  }

  addRootObject(datasource: Datasource): void {
    const newNode: SchemaNode = {
      id: `root-${Date.now()}`,
      name: this.schemaService.getUniqueNodeName(datasource.nodes, 'New Object'),
      code: 'NEW_OBJECT',
      nodeType: 'OBJECT',
      dataType: 'OBJECT',
      sourceMapping: '',
      destinationMapping: '',
      validations: [],
      businessRules: [],
      transformations: [],
      children: []
    };
    datasource.nodes.push(newNode);
    this.schemaService.updateNode(newNode);
  }

  addRootArray(datasource: Datasource): void {
    const newNode: SchemaNode = {
      id: `root-${Date.now()}`,
      name: this.schemaService.getUniqueNodeName(datasource.nodes, 'New Array'),
      code: 'NEW_ARRAY',
      nodeType: 'ARRAY',
      dataType: 'ARRAY',
      sourceMapping: '',
      destinationMapping: '',
      validations: [],
      businessRules: [],
      transformations: [],
      children: []
    };
    datasource.nodes.push(newNode);
    this.schemaService.updateNode(newNode);
  }

  requestDeleteNode(node: SchemaNode): void {
    this.pendingDeleteNode = node;
  }

  cancelDeleteNode(): void {
    this.pendingDeleteNode = null;
  }

  confirmDeleteNode(): void {
    const node = this.pendingDeleteNode;

    if (!node) {
      return;
    }

    this.schemaService.deleteNode(node.id);
    this.expandedNodeIds.delete(node.id);
    this.pendingDeleteNode = null;
    this.refreshTreeView();
  }

  trackDatasource(_: number, datasource: TreeViewDatasource): string {
    return datasource.datasource.id;
  }

  trackTreeItem(_: number, item: TreeViewItem): string {
    return item.node.id;
  }

  private refreshTreeView(): void {
    const query = this.searchQuery.trim().toLowerCase();
    const filteredDatasources = this.datasources
      .map(datasource => this.buildTreeViewDatasource(datasource, query))
      .filter((datasource): datasource is TreeViewDatasource => datasource !== null);

    this.filteredDatasources = filteredDatasources;
    this.visibleDatasourceCount = filteredDatasources.length;
    this.totalNodeCount = this.datasources.reduce((count, datasource) => count + this.countNodes(datasource.nodes), 0);
    this.visibleNodeCount = filteredDatasources.reduce((count, datasource) => count + datasource.visibleNodes, 0);

    if (query) {
      this.expandedNodeIds = this.collectExpandableNodeIds(filteredDatasources);
    }
  }

  private buildTreeViewDatasource(datasource: Datasource, query: string): TreeViewDatasource | null {
    const nodes = this.buildTreeItems(datasource.nodes, query);
    const totalNodes = this.countNodes(datasource.nodes);
    const visibleNodes = this.countVisibleItems(nodes);

    if (query && nodes.length === 0) {
      return null;
    }

    return {
      datasource,
      nodes,
      totalNodes,
      visibleNodes
    };
  }

  private buildTreeItems(nodes: SchemaNode[], query: string): TreeViewItem[] {
    return nodes
      .map(node => this.buildTreeItem(node, query))
      .filter((item): item is TreeViewItem => item !== null);
  }

  private buildTreeItem(node: SchemaNode, query: string): TreeViewItem | null {
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

  private matchesNode(node: SchemaNode, query: string): boolean {
    return node.name.toLowerCase().includes(query)
      || node.code.toLowerCase().includes(query)
      || node.nodeType.toLowerCase().includes(query);
  }

  private collectExpandableNodeIds(datasources: TreeViewDatasource[]): Set<string> {
    const expandedIds = new Set<string>();

    datasources.forEach(datasource => {
      datasource.nodes.forEach(item => this.collectExpandableFromItem(item, expandedIds));
    });

    return expandedIds;
  }

  private collectExpandableFromItem(item: TreeViewItem, expandedIds: Set<string>): void {
    if (item.children.length > 0) {
      expandedIds.add(item.node.id);
      item.children.forEach(child => this.collectExpandableFromItem(child, expandedIds));
    }
  }

  private countNodes(nodes: SchemaNode[]): number {
    return nodes.reduce((count, node) => count + 1 + this.countNodes(node.children), 0);
  }

  private countVisibleItems(items: TreeViewItem[]): number {
    return items.reduce((count, item) => count + 1 + this.countVisibleItems(item.children), 0);
  }
}

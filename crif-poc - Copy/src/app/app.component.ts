import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MasterModelTreeComponent } from './components/master-model-tree/master-model-tree.component';
import { MasterModelConfigComponent } from './components/master-model-config/master-model-config.component';
import { TreeViewComponent } from './components/tree-view/tree-view.component';
import { NodeConfigComponent } from './components/node-config/node-config.component';
import { SchemaService } from './services/schema.service';
import { Datasource, DatasourceStatus, SchemaNode, SourceMappingType, TreePathNode } from './models/schema-node.model';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule, MasterModelTreeComponent, MasterModelConfigComponent, TreeViewComponent, NodeConfigComponent],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  title = 'MongoDB Schema Configuration';
  activeMenu: 'onboardingWorkspace' | 'masterModel' = 'onboardingWorkspace';
  activeTab: 'onboarding' | 'profileGeneration' | 'application' = 'onboarding';
  datasources: Datasource[] = [];
  isSideNavCollapsed = false;
  isTreePaneCollapsed = false;
  isMasterPaneCollapsed = false;
  isProfileCreationInProgress = false;
  profileCreationMessage = '';
  sourceTypes: SourceMappingType[] = ['JSON', 'XML', 'CSV'];
  datasourceStatuses: DatasourceStatus[] = ['ACTIVE', 'INACTIVE'];
  onboardingDatasourceId = '';
  pkPattern = '';
  onboardingForm = {
    name: '',
    sourceType: 'JSON' as SourceMappingType,
    status: 'ACTIVE' as DatasourceStatus
  };
  sampleFileNames: string[] = [];
  schemaFileName = '';
  metadataFileName = '';

  constructor(private schemaService: SchemaService) {}

  ngOnInit(): void {
    this.schemaService.datasources$.subscribe(datasources => {
      this.datasources = datasources;
      const primaryDatasource = datasources[0];

      if (!primaryDatasource) {
        return;
      }

      this.onboardingDatasourceId = primaryDatasource.id;
      this.pkPattern = primaryDatasource.pkPattern ?? '';
      this.onboardingForm = {
        name: primaryDatasource.name,
        sourceType: primaryDatasource.sourceType,
        status: primaryDatasource.status
      };
    });
  }

  setActiveMenu(menu: 'onboardingWorkspace' | 'masterModel'): void {
    this.activeMenu = menu;

    if (menu === 'masterModel') {
      this.ensureProfileSelection();
    }
  }

  setActiveTab(tab: 'onboarding' | 'profileGeneration' | 'application'): void {
    this.activeTab = tab;
  }

  saveDatasourceDetails(): void {
    if (!this.onboardingDatasourceId) {
      return;
    }

    this.schemaService.updateDatasourceDetails(this.onboardingDatasourceId, {
      name: this.onboardingForm.name.trim(),
      sourceType: this.onboardingForm.sourceType,
      status: this.onboardingForm.status
    });
  }

  savePkPattern(): void {
    if (!this.onboardingDatasourceId) {
      return;
    }

    this.schemaService.updateDatasourceDetails(this.onboardingDatasourceId, {
      pkPattern: this.pkPattern.trim()
    });
  }

  goToProfileGeneration(): void {
    this.saveDatasourceDetails();
    this.setActiveTab('profileGeneration');
  }

  goToApplication(): void {
    if (this.isProfileCreationInProgress) {
      return;
    }

    this.isProfileCreationInProgress = true;
    this.profileCreationMessage = 'Profile creation is in progress with AI. Wait for 5 seconds...';

    setTimeout(() => {
      this.isProfileCreationInProgress = false;
      this.profileCreationMessage = '';
      this.setActiveTab('application');
    }, 5000);
  }

  toggleTreePane(): void {
    this.isTreePaneCollapsed = !this.isTreePaneCollapsed;
  }

  toggleSideNav(): void {
    this.isSideNavCollapsed = !this.isSideNavCollapsed;
  }

  toggleMasterPane(): void {
    this.isMasterPaneCollapsed = !this.isMasterPaneCollapsed;
  }

  onSampleFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.sampleFileNames = Array.from(input.files ?? []).map(file => file.name);
  }

  removeSampleFile(index: number): void {
    this.sampleFileNames = this.sampleFileNames.filter((_, fileIndex) => fileIndex !== index);
  }

  onSchemaFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.schemaFileName = input.files?.[0]?.name ?? '';
  }

  onMetadataFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.metadataFileName = input.files?.[0]?.name ?? '';
  }

  private ensureProfileSelection(): void {
    if (this.activeMenu === 'masterModel') {
      if (this.schemaService.getSelectedMasterNode()) {
        return;
      }

      const firstMasterNode = this.findFirstMasterNode(this.schemaService.getMasterPathTree());

      if (firstMasterNode) {
        this.schemaService.selectMasterNode(firstMasterNode.fullPath);
      }

      return;
    }

    if (this.schemaService.getSelectedNode()) {
      return;
    }

    const firstNode = this.findFirstNode(this.datasources[0]?.nodes ?? []);

    if (firstNode) {
      this.schemaService.selectNode(firstNode);
    }
  }

  private findFirstNode(nodes: SchemaNode[]): SchemaNode | null {
    for (const node of nodes) {
      if (node.nodeType === 'FIELD') {
        return node;
      }

      const childNode = this.findFirstNode(node.children);

      if (childNode) {
        return childNode;
      }
    }

    return nodes[0] ?? null;
  }

  private findFirstMasterNode(nodes: TreePathNode[]): TreePathNode | null {
    for (const node of nodes) {
      if (node.isLeaf || node.key === '[*]') {
        return node;
      }

      const childNode = this.findFirstMasterNode(node.children);

      if (childNode) {
        return childNode;
      }
    }

    return nodes[0] ?? null;
  }
}

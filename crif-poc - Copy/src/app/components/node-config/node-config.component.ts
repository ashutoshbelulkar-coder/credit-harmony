import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SchemaService } from '../../services/schema.service';
import { TreePathPickerModalComponent } from '../tree-path-picker/tree-path-picker-modal.component';
import {
  CrossFieldValidation,
  SchemaNode,
  Datasource,
  FieldValueMode,
  FieldProfile,
  FieldValidationRule,
  ProfileReviewAction,
  ProfileReviewStatus,
  ReviewComment,
  SchemaValidationResult,
  ValidationSeverity,
  Validation,
  BusinessRule,
  Transformation,
  TreePathNode
} from '../../models/schema-node.model';

@Component({
  selector: 'app-node-config',
  standalone: true,
  imports: [CommonModule, FormsModule, TreePathPickerModalComponent],
  templateUrl: './node-config.component.html',
  styleUrls: ['./node-config.component.scss']
})
export class NodeConfigComponent implements OnInit {
  @Input() pkPattern = '';
  @Output() pkPatternSave = new EventEmitter<string>();

  activeView: 'configuration' | 'review' | 'profileJson' | 'savedTree' = 'configuration';
  selectedNode: SchemaNode | null = null;
  datasources: Datasource[] = [];
  masterPathSuggestions: string[] = [];
  masterPathTree: TreePathNode[] = [];
  selectedMasterTargetPath = '';
  manualTargetPath = '';
  selectedCrossFieldPath = '';
  manualCrossFieldPath = '';
  savedDatasources: Datasource[] = [];
  savedJson = '{}';
  schemaValidation: SchemaValidationResult = { isValid: true, errors: [] };
  saveStatus = '';
  saveStatusType: 'success' | 'error' = 'success';
  reviewCommentDraft = '';
  reviewStatusMessage = '';
  reviewStatusType: 'success' | 'error' = 'success';

  // Modal state for tree path picker
  targetPathModalOpen = false;
  crossFieldPathModalOpen = false;
  selectedCrossFieldIndex = -1;
  currentEditingProfile: FieldProfile | null = null;

  nodeTypes = ['FIELD', 'OBJECT', 'ARRAY'];
  dataTypes = ['STRING', 'NUMBER', 'BOOLEAN', 'DATE', 'OBJECT', 'ARRAY'];
  severities: ValidationSeverity[] = ['Error', 'Warning', 'Info'];
  validationRuleTypes = ['NOT_EMPTY', 'MAX_LENGTH', 'MIN_LENGTH', 'REGEX', 'UNIQUE'];
  fieldBusinessValidationTypes = ['MANDATORY_CHECK', 'FORMAT_CHECK', 'DOMAIN_CHECK', 'RANGE_CHECK'];
  validationTypes = ['MANDATORY', 'UNIQUE', 'EMAIL', 'PATTERN', 'MIN_LENGTH', 'MAX_LENGTH'];
  businessRuleCodes = ['BR001', 'BR002', 'BR003', 'BR004'];
  transformationTypes = ['ALL_CAPS', 'ALL_LOWERCASE', 'TRIM', 'REPLACE', 'CONCATENATE'];
  valueModes: FieldValueMode[] = ['DEFAULT', 'ENUM'];
  reviewStatuses: ProfileReviewStatus[] = ['PENDING', 'APPROVED', 'REJECTED', 'CHANGES_REQUESTED'];

  newValidation: Validation = { id: '', type: 'MANDATORY' };
  newBusinessRule: BusinessRule = { id: '', code: 'BR001' };
  newTransformation: Transformation = { id: '', type: 'ALL_CAPS' };
  newFieldRule: FieldValidationRule = { Rule: 'NOT_EMPTY', Severity: 'Error', Message: '' };
  newFieldTransformation = 'TRIM';
  newSimilarField = '';
  newBusinessValidation = 'MANDATORY_CHECK';
  newCrossFieldValidation: CrossFieldValidation = { FieldPath: '', Rule: '', Severity: 'Error' };
  newPossibleValue = '';

  constructor(private schemaService: SchemaService) {}

  ngOnInit(): void {
    this.schemaService.selectedNode$.subscribe(node => {
      if (node) {
        this.schemaService.ensureFieldProfile(node);
      }
      this.selectedNode = node;
      this.resetNewItems();
    });

    this.schemaService.savedDatasources$.subscribe(datasources => {
      this.savedDatasources = datasources;
    });

    this.schemaService.datasources$.subscribe(datasources => {
      this.datasources = datasources;
    });

    this.schemaService.masterPathSuggestions$.subscribe(paths => {
      this.masterPathSuggestions = paths;
    });

    this.schemaService.masterPathTree$.subscribe(tree => {
      this.masterPathTree = tree;
    });

    this.schemaService.savedJson$.subscribe(json => {
      this.savedJson = json;
    });

    this.schemaService.schemaValidation$.subscribe(validation => {
      this.schemaValidation = validation;
    });
  }

  resetNewItems(): void {
    this.newValidation = { id: '', type: 'MANDATORY', value: '' };
    this.newBusinessRule = { id: '', code: 'BR001' };
    this.newTransformation = { id: '', type: 'ALL_CAPS' };
    this.newFieldRule = { Rule: 'NOT_EMPTY', Severity: 'Error', Message: '' };
    this.newFieldTransformation = 'TRIM';
    this.newSimilarField = '';
    this.newBusinessValidation = 'MANDATORY_CHECK';
    this.newCrossFieldValidation = { FieldPath: '', Rule: '', Severity: 'Error' };
    this.newPossibleValue = '';
    this.selectedMasterTargetPath = '';
  }

  getActiveDatasource(): Datasource | null {
    if (this.selectedNode) {
      const datasource = this.datasources.find(item => item.nodes.some(node => this.containsNode(node, this.selectedNode!.id)));
      if (datasource) {
        return datasource;
      }
    }

    return this.datasources[0] ?? null;
  }

  getReviewComments(): ReviewComment[] {
    return this.getActiveDatasource()?.reviewComments ?? [];
  }

  submitReviewAction(action: ProfileReviewAction): void {
    const datasource = this.getActiveDatasource();

    if (!datasource) {
      this.reviewStatusMessage = 'No datasource available for review.';
      this.reviewStatusType = 'error';
      return;
    }

    if (action === 'REQUEST_CHANGES' && !this.reviewCommentDraft.trim()) {
      this.reviewStatusMessage = 'Add a comment before requesting changes.';
      this.reviewStatusType = 'error';
      return;
    }

    this.schemaService.updateDatasourceReview(datasource.id, action, this.reviewCommentDraft);
    this.reviewStatusMessage = action === 'APPROVE'
      ? 'Profile approved.'
      : action === 'REJECT'
        ? 'Profile rejected.'
        : 'Change request recorded.';
    this.reviewStatusType = 'success';
    this.reviewCommentDraft = '';

    setTimeout(() => {
      this.reviewStatusMessage = '';
    }, 2500);
  }

  getReviewActionLabel(action: ProfileReviewAction): string {
    switch (action) {
      case 'APPROVE':
        return 'Approved';
      case 'REJECT':
        return 'Rejected';
      case 'REQUEST_CHANGES':
        return 'Requested Changes';
    }
  }

  formatReviewTimestamp(value: string): string {
    if (!value) {
      return '';
    }

    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString();
  }

  updateNode(): void {
    if (this.selectedNode) {
      this.schemaService.updateNode(this.selectedNode);
    }
  }

  private containsNode(node: SchemaNode, nodeId: string): boolean {
    return node.id === nodeId || node.children.some(child => this.containsNode(child, nodeId));
  }

  saveTree(): void {
    const saved = this.schemaService.saveDatasources();
    this.saveStatus = saved ? 'Saved' : 'Fix validation errors';
    this.saveStatusType = saved ? 'success' : 'error';

    setTimeout(() => {
      this.saveStatus = '';
    }, 2000);
  }

  hasSavedTree(): boolean {
    return this.savedDatasources.some(datasource => datasource.nodes.length > 0);
  }

  setActiveView(view: 'configuration' | 'review' | 'profileJson' | 'savedTree'): void {
    this.activeView = view;
  }

  hasFieldProfileSelected(): boolean {
    return !!this.getFieldProfile();
  }

  isFieldNode(): boolean {
    return this.selectedNode?.nodeType === 'FIELD';
  }

  getFieldProfile(): FieldProfile | null {
    if (!this.selectedNode || this.selectedNode.nodeType !== 'FIELD') {
      return null;
    }

    this.schemaService.ensureFieldProfile(this.selectedNode);
    return this.selectedNode.fieldProfile ?? null;
  }

  updateFieldProfile(): void {
    const profile = this.getFieldProfile();

    if (!this.selectedNode || !profile) {
      return;
    }

    this.selectedNode.name = profile.DisplayName || profile.FieldName || this.selectedNode.name;
    this.selectedNode.code = profile.FieldName
      .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
      .replace(/[^A-Za-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .toUpperCase() || this.selectedNode.code;
    this.selectedNode.dataType = profile.DataType;
    this.selectedNode.sourceMapping = profile.SourceMapping.SourcePath;
    this.selectedNode.destinationMapping = profile.SourceMapping.TargetPath || profile.FieldPath;
    this.schemaService.updateNode(this.selectedNode);
  }

  applySelectedMasterTargetPath(profile: FieldProfile): void {
    if (!this.selectedMasterTargetPath) {
      return;
    }

    profile.SourceMapping.TargetPath = this.selectedMasterTargetPath;
    this.updateFieldProfile();
  }

  applyCrossFieldMasterPath(crossValidation: CrossFieldValidation, selectedPath: string): void {
    if (!selectedPath) {
      return;
    }

    crossValidation.FieldPath = selectedPath;
    this.updateFieldProfile();
  }

  // Modal Path Picker Methods
  openTargetPathModal(profile: FieldProfile): void {
    this.currentEditingProfile = profile;
    this.targetPathModalOpen = true;
  }

  closeTargetPathModal(): void {
    this.targetPathModalOpen = false;
    this.currentEditingProfile = null;
  }

  onTargetPathFromModal(selectedPath: string): void {
    if (this.currentEditingProfile) {
      this.currentEditingProfile.SourceMapping.TargetPath = selectedPath;
      this.updateFieldProfile();
      this.closeTargetPathModal();
    }
  }

  onTargetPathManualFromModal(manualPath: string): void {
    if (this.currentEditingProfile && manualPath.trim()) {
      this.currentEditingProfile.SourceMapping.TargetPath = manualPath.trim();
      this.updateFieldProfile();
      this.closeTargetPathModal();
    }
  }

  openCrossFieldPathModal(profile: FieldProfile, index: number): void {
    this.currentEditingProfile = profile;
    this.selectedCrossFieldIndex = index;
    this.crossFieldPathModalOpen = true;
  }

  closeCrossFieldPathModal(): void {
    this.crossFieldPathModalOpen = false;
    this.currentEditingProfile = null;
    this.selectedCrossFieldIndex = -1;
  }

  onCrossFieldPathFromModal(selectedPath: string): void {
    if (this.currentEditingProfile && this.selectedCrossFieldIndex >= 0) {
      const crossValidation = this.currentEditingProfile.CrossFieldValidations[this.selectedCrossFieldIndex];
      if (crossValidation) {
        crossValidation.FieldPath = selectedPath;
        this.updateFieldProfile();
        this.closeCrossFieldPathModal();
      }
    }
  }

  onCrossFieldPathManualFromModal(manualPath: string): void {
    if (this.currentEditingProfile && this.selectedCrossFieldIndex >= 0 && manualPath.trim()) {
      const crossValidation = this.currentEditingProfile.CrossFieldValidations[this.selectedCrossFieldIndex];
      if (crossValidation) {
        crossValidation.FieldPath = manualPath.trim();
        this.updateFieldProfile();
        this.closeCrossFieldPathModal();
      }
    }
  }

  openCrossFieldAddModal(profile: FieldProfile): void {
    this.currentEditingProfile = profile;
    this.selectedCrossFieldIndex = -2; // Special flag for "add new"
    this.crossFieldPathModalOpen = true;
  }

  onCrossFieldAddFromModal(selectedPath: string): void {
    if (this.currentEditingProfile && this.selectedCrossFieldIndex === -2) {
      this.newCrossFieldValidation.FieldPath = selectedPath;
      this.addCrossFieldValidation(this.currentEditingProfile);
      this.closeCrossFieldPathModal();
    }
  }

  onCrossFieldAddManualFromModal(manualPath: string): void {
    if (this.currentEditingProfile && this.selectedCrossFieldIndex === -2 && manualPath.trim()) {
      this.newCrossFieldValidation.FieldPath = manualPath.trim();
      this.addCrossFieldValidation(this.currentEditingProfile);
      this.closeCrossFieldPathModal();
    }
  }

  // Tree Path Picker Methods
  onTargetPathSelected(selectedPath: string, profile: FieldProfile): void {
    profile.SourceMapping.TargetPath = selectedPath;
    this.updateFieldProfile();
    this.manualTargetPath = '';
  }

  onTargetPathManualChange(newPath: string, profile: FieldProfile): void {
    profile.SourceMapping.TargetPath = newPath;
    this.updateFieldProfile();
  }

  onCrossFieldPathSelected(selectedPath: string, crossValidation: CrossFieldValidation): void {
    crossValidation.FieldPath = selectedPath;
    this.updateFieldProfile();
    this.manualCrossFieldPath = '';
  }

  onCrossFieldPathManualChange(newPath: string, crossValidation: CrossFieldValidation): void {
    crossValidation.FieldPath = newPath;
    this.updateFieldProfile();
  }

  isScalarFieldProfile(profile: FieldProfile): boolean {
    return profile.DataType !== 'OBJECT' && profile.DataType !== 'ARRAY';
  }

  onProfileDataTypeChange(profile: FieldProfile): void {
    if (!this.isScalarFieldProfile(profile)) {
      profile.IsPII = false;
      profile.SimilarFields = [];
      profile.Description = '';
      profile.BusinessValidations = [];
      profile.CrossFieldValidations = [];
      profile.ValueMode = 'DEFAULT';
      profile.DefaultValue = null;
      profile.PossibleValues = [];
    }

    this.updateFieldProfile();
  }

  addSimilarField(profile: FieldProfile): void {
    const value = this.newSimilarField.trim();

    if (!value || profile.SimilarFields.includes(value)) {
      return;
    }

    profile.SimilarFields.push(value);
    this.newSimilarField = '';
    this.updateFieldProfile();
  }

  removeSimilarField(profile: FieldProfile, index: number): void {
    profile.SimilarFields.splice(index, 1);
    this.updateFieldProfile();
  }

  addBusinessValidation(profile: FieldProfile): void {
    if (!this.newBusinessValidation || profile.BusinessValidations.includes(this.newBusinessValidation)) {
      return;
    }

    profile.BusinessValidations.push(this.newBusinessValidation);
    this.updateFieldProfile();
  }

  removeBusinessValidation(profile: FieldProfile, index: number): void {
    profile.BusinessValidations.splice(index, 1);
    this.updateFieldProfile();
  }

  addCrossFieldValidation(profile: FieldProfile): void {
    if (!this.newCrossFieldValidation.FieldPath.trim() || !this.newCrossFieldValidation.Rule.trim()) {
      return;
    }

    profile.CrossFieldValidations.push({
      FieldPath: this.newCrossFieldValidation.FieldPath.trim(),
      Rule: this.newCrossFieldValidation.Rule.trim(),
      Severity: this.newCrossFieldValidation.Severity
    });

    this.newCrossFieldValidation = { FieldPath: '', Rule: '', Severity: 'Error' };
    this.updateFieldProfile();
  }

  removeCrossFieldValidation(profile: FieldProfile, index: number): void {
    profile.CrossFieldValidations.splice(index, 1);
    this.updateFieldProfile();
  }

  onValueModeChange(profile: FieldProfile): void {
    if (profile.ValueMode === 'ENUM') {
      profile.DefaultValue = null;
    } else {
      profile.PossibleValues = [];
    }

    this.updateFieldProfile();
  }

  addPossibleValue(profile: FieldProfile): void {
    const value = this.newPossibleValue.trim();

    if (!value || profile.PossibleValues.includes(value)) {
      return;
    }

    profile.PossibleValues.push(value);
    this.newPossibleValue = '';
    this.updateFieldProfile();
  }

  removePossibleValue(profile: FieldProfile, index: number): void {
    profile.PossibleValues.splice(index, 1);
    this.updateFieldProfile();
  }

  addFieldRule(): void {
    const profile = this.getFieldProfile();

    if (!profile || !this.newFieldRule.Rule) {
      return;
    }

    profile.Validation.Rules.push(this.cleanRuleForType(this.newFieldRule));
    this.newFieldRule = { Rule: 'NOT_EMPTY', Severity: 'Error', Message: '' };
    this.updateFieldProfile();
  }

  removeFieldRule(index: number): void {
    const profile = this.getFieldProfile();

    if (!profile) {
      return;
    }

    profile.Validation.Rules.splice(index, 1);
    this.updateFieldProfile();
  }

  addFieldTransformation(): void {
    const profile = this.getFieldProfile();

    if (!profile || !this.newFieldTransformation) {
      return;
    }

    if (!profile.Transformations.includes(this.newFieldTransformation)) {
      profile.Transformations.push(this.newFieldTransformation);
      this.updateFieldProfile();
    }
  }

  removeFieldTransformation(index: number): void {
    const profile = this.getFieldProfile();

    if (!profile) {
      return;
    }

    profile.Transformations.splice(index, 1);
    this.updateFieldProfile();
  }

  getSelectedFieldProfileJson(): string {
    const profile = this.getFieldProfile();
    if (!profile) {
      return '{}';
    }
    const { Section: _s, Validation: { Type: _t, ...validationRest }, SourceMapping: { SourceType: _st, ...sourceMappingRest }, ...rest } = profile;
    const cleaned = { ...rest, Validation: validationRest, SourceMapping: sourceMappingRest };
    return JSON.stringify(cleaned, null, 2);
  }

  onRuleTypeChange(rule: FieldValidationRule): void {
    const cleanedRule = this.cleanRuleForType(rule);
    rule.Value = cleanedRule.Value;
    rule.Pattern = cleanedRule.Pattern;
  }

  needsRuleValue(ruleType: string): boolean {
    return ruleType === 'MAX_LENGTH' || ruleType === 'MIN_LENGTH';
  }

  needsRulePattern(ruleType: string): boolean {
    return ruleType === 'REGEX';
  }

  getRuleValuePlaceholder(ruleType: string): string {
    return ruleType === 'MIN_LENGTH' ? 'Min value' : 'Max value';
  }

  private cleanRuleForType(rule: FieldValidationRule): FieldValidationRule {
    const cleanedRule: FieldValidationRule = {
      Rule: rule.Rule,
      Severity: rule.Severity || 'Error',
      Message: rule.Message
    };

    if (this.needsRuleValue(rule.Rule)) {
      cleanedRule.Value = rule.Value ?? null;
    }

    if (this.needsRulePattern(rule.Rule)) {
      cleanedRule.Pattern = rule.Pattern ?? '';
    }

    return cleanedRule;
  }

  canAddChildren(): boolean {
    return !!this.selectedNode && this.schemaService.canHaveChildren(this.selectedNode);
  }

  addChildOfType(nodeType: SchemaNode['nodeType']): void {
    if (!this.selectedNode || !this.schemaService.canHaveChildren(this.selectedNode)) {
      return;
    }

    const defaults = {
      FIELD: {
        name: 'New Field',
        code: 'NEW_FIELD',
        dataType: 'STRING' as const
      },
      OBJECT: {
        name: 'New Object',
        code: 'NEW_OBJECT',
        dataType: 'OBJECT' as const
      },
      ARRAY: {
        name: 'New Array',
        code: 'NEW_ARRAY',
        dataType: 'ARRAY' as const
      }
    };
    const nodeDefaults = defaults[nodeType];
    const newChild: SchemaNode = {
      id: `${this.selectedNode.id}-child-${Date.now()}`,
      name: this.schemaService.getUniqueNodeName(this.selectedNode.children, nodeDefaults.name),
      code: nodeDefaults.code,
      nodeType,
      dataType: nodeDefaults.dataType,
      sourceMapping: '',
      destinationMapping: '',
      validations: [],
      businessRules: [],
      transformations: [],
      children: []
    };

    this.schemaService.addChild(this.selectedNode, newChild);
  }

  requiresValue(validationType: string): boolean {
    return ['PATTERN', 'MIN_LENGTH', 'MAX_LENGTH', 'REPLACE', 'CONCATENATE'].includes(validationType);
  }

  getValidationDisplay(validation: Validation): string {
    if (validation.value) {
      return `${validation.type}: ${validation.value}`;
    }
    return validation.type;
  }

  addValidation(): void {
    if (this.selectedNode && this.newValidation.type) {
      const validation: Validation = {
        id: `val-${Date.now()}`,
        type: this.newValidation.type,
        value: this.newValidation.value
      };
      this.selectedNode.validations.push(validation);
      this.updateNode();
      this.newValidation = { id: '', type: 'MANDATORY' };
    }
  }

  removeValidation(index: number): void {
    if (this.selectedNode) {
      this.selectedNode.validations.splice(index, 1);
      this.updateNode();
    }
  }

  addBusinessRule(): void {
    if (this.selectedNode && this.newBusinessRule.code) {
      const rule: BusinessRule = {
        id: `br-${Date.now()}`,
        code: this.newBusinessRule.code,
        description: this.newBusinessRule.description
      };
      this.selectedNode.businessRules.push(rule);
      this.updateNode();
      this.newBusinessRule = { id: '', code: 'BR001' };
    }
  }

  removeBusinessRule(index: number): void {
    if (this.selectedNode) {
      this.selectedNode.businessRules.splice(index, 1);
      this.updateNode();
    }
  }

  addTransformation(): void {
    if (this.selectedNode && this.newTransformation.type) {
      const transformation: Transformation = {
        id: `trans-${Date.now()}`,
        type: this.newTransformation.type,
        value: this.newTransformation.value
      };
      this.selectedNode.transformations.push(transformation);
      this.updateNode();
      this.newTransformation = { id: '', type: 'ALL_CAPS' };
    }
  }

  removeTransformation(index: number): void {
    if (this.selectedNode) {
      this.selectedNode.transformations.splice(index, 1);
      this.updateNode();
    }
  }

  addChild(): void {
    this.addChildOfType('FIELD');
  }
}

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  CrossFieldValidation,
  FieldValidationRule,
  MasterNodeProfile,
  TreePathNode,
  ValidationSeverity
} from '../../models/schema-node.model';
import { SchemaService } from '../../services/schema.service';

@Component({
  selector: 'app-master-model-config',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './master-model-config.component.html',
  styleUrls: ['./master-model-config.component.scss']
})
export class MasterModelConfigComponent implements OnInit {
  selectedMasterNode: TreePathNode | null = null;
  saveStatus = '';
  newSimilarField = '';
  newValidationRule: FieldValidationRule = { Rule: 'NOT_EMPTY', Severity: 'Error', Message: '' };
  newBusinessValidation = 'MANDATORY_CHECK';
  newCrossFieldValidation: CrossFieldValidation = { FieldPath: '', Rule: '', Severity: 'Error' };
  newPossibleValue = '';
  newTransformation = '';

  dataTypes: MasterNodeProfile['dataType'][] = ['STRING', 'NUMBER', 'BOOLEAN', 'DATE', 'OBJECT', 'ARRAY'];
  valueModes: MasterNodeProfile['valueMode'][] = ['DEFAULT', 'ENUM'];
  severities: ValidationSeverity[] = ['Error', 'Warning', 'Info'];
  validationRuleTypes = ['NOT_EMPTY', 'MAX_LENGTH', 'MIN_LENGTH', 'REGEX', 'UNIQUE'];
  fieldBusinessValidationTypes = ['MANDATORY_CHECK', 'FORMAT_CHECK', 'DOMAIN_CHECK', 'RANGE_CHECK'];

  constructor(private schemaService: SchemaService) {}

  ngOnInit(): void {
    this.schemaService.selectedMasterNode$.subscribe(node => {
      this.selectedMasterNode = node;
    });
  }

  updateSelectedNode(changes: Partial<MasterNodeProfile> & { key?: string }): void {
    if (!this.selectedMasterNode) {
      return;
    }

    this.schemaService.updateMasterNodeProfile(this.selectedMasterNode.fullPath, changes);
    this.saveStatus = 'Saved';

    setTimeout(() => {
      this.saveStatus = '';
    }, 1600);
  }

  getProfile(node: TreePathNode): MasterNodeProfile {
    return node.profile as MasterNodeProfile;
  }

  onFieldKeyChange(value: string): void {
    this.updateSelectedNode({ key: value });
  }

  onValueModeChange(profile: MasterNodeProfile, mode: MasterNodeProfile['valueMode']): void {
    if (mode === 'ENUM') {
      this.updateSelectedNode({ valueMode: mode, defaultValue: null });
      return;
    }

    this.updateSelectedNode({ valueMode: mode, possibleValues: [] });
  }

  updateValidationRule(profile: MasterNodeProfile, index: number, changes: Partial<FieldValidationRule>): void {
    const nextRules = profile.validationRules.map((rule, ruleIndex) =>
      ruleIndex === index ? { ...rule, ...changes } : rule
    );
    this.updateSelectedNode({ validationRules: nextRules });
  }

  addValidationRule(profile: MasterNodeProfile): void {
    if (!this.newValidationRule.Rule.trim()) {
      return;
    }

    const nextRules = [...profile.validationRules, { ...this.newValidationRule }];
    this.updateSelectedNode({ validationRules: nextRules });
    this.newValidationRule = { Rule: 'NOT_EMPTY', Severity: 'Error', Message: '' };
  }

  removeValidationRule(profile: MasterNodeProfile, index: number): void {
    const nextRules = profile.validationRules.filter((_, ruleIndex) => ruleIndex !== index);
    this.updateSelectedNode({ validationRules: nextRules });
  }

  addBusinessValidation(profile: MasterNodeProfile): void {
    const value = this.newBusinessValidation.trim();

    if (!value || profile.businessValidations.includes(value)) {
      return;
    }

    this.updateSelectedNode({ businessValidations: [...profile.businessValidations, value] });
    this.newBusinessValidation = '';
  }

  removeBusinessValidation(profile: MasterNodeProfile, index: number): void {
    const nextItems = profile.businessValidations.filter((_, itemIndex) => itemIndex !== index);
    this.updateSelectedNode({ businessValidations: nextItems });
  }

  updateCrossFieldValidation(
    profile: MasterNodeProfile,
    index: number,
    changes: Partial<CrossFieldValidation>
  ): void {
    const nextValidations = profile.crossFieldValidations.map((item, itemIndex) =>
      itemIndex === index ? { ...item, ...changes } : item
    );
    this.updateSelectedNode({ crossFieldValidations: nextValidations });
  }

  addCrossFieldValidation(profile: MasterNodeProfile): void {
    if (!this.newCrossFieldValidation.FieldPath.trim() || !this.newCrossFieldValidation.Rule.trim()) {
      return;
    }

    const nextValidations = [...profile.crossFieldValidations, { ...this.newCrossFieldValidation }];
    this.updateSelectedNode({ crossFieldValidations: nextValidations });
    this.newCrossFieldValidation = { FieldPath: '', Rule: '', Severity: 'Error' };
  }

  removeCrossFieldValidation(profile: MasterNodeProfile, index: number): void {
    const nextValidations = profile.crossFieldValidations.filter((_, itemIndex) => itemIndex !== index);
    this.updateSelectedNode({ crossFieldValidations: nextValidations });
  }

  addPossibleValue(profile: MasterNodeProfile): void {
    const value = this.newPossibleValue.trim();

    if (!value || profile.possibleValues.includes(value)) {
      return;
    }

    this.updateSelectedNode({ possibleValues: [...profile.possibleValues, value] });
    this.newPossibleValue = '';
  }

  removePossibleValue(profile: MasterNodeProfile, index: number): void {
    const nextValues = profile.possibleValues.filter((_, valueIndex) => valueIndex !== index);
    this.updateSelectedNode({ possibleValues: nextValues });
  }

  addTransformation(profile: MasterNodeProfile): void {
    const value = this.newTransformation.trim();

    if (!value || profile.transformations.includes(value)) {
      return;
    }

    this.updateSelectedNode({ transformations: [...profile.transformations, value] });
    this.newTransformation = '';
  }

  removeTransformation(profile: MasterNodeProfile, index: number): void {
    const nextTransformations = profile.transformations.filter((_, itemIndex) => itemIndex !== index);
    this.updateSelectedNode({ transformations: nextTransformations });
  }

  isScalarProfile(profile: MasterNodeProfile): boolean {
    return profile.dataType !== 'OBJECT' && profile.dataType !== 'ARRAY';
  }

  addSimilarField(profile: MasterNodeProfile): void {
    const value = this.newSimilarField.trim();

    if (!value || profile.similarFields.includes(value)) {
      return;
    }

    this.updateSelectedNode({ similarFields: [...profile.similarFields, value] });
    this.newSimilarField = '';
  }

  removeSimilarField(profile: MasterNodeProfile, index: number): void {
    const nextSimilarFields = profile.similarFields.filter((_, itemIndex) => itemIndex !== index);
    this.updateSelectedNode({ similarFields: nextSimilarFields });
  }

  getNodeRole(node: TreePathNode): string {
    if (node.key === '[*]' || node.children.some(child => child.key === '[*]')) {
      return 'Array';
    }

    return node.isLeaf ? 'Field' : 'Object';
  }

  canRenameNode(node: TreePathNode): boolean {
    return node.key !== '[*]';
  }
}
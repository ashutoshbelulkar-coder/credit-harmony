import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import {
  MasterNodeProfile,
  SchemaNode,
  BusinessRule,
  Datasource,
  DatasourceStatus,
  FieldValueMode,
  FieldProfile,
  FieldSourceMapping,
  FieldValidationRule,
  ProfileReviewAction,
  ProfileReviewStatus,
  ReviewComment,
  SchemaProfileExport,
  SchemaValidationResult,
  SourceMappingType,
  Transformation,
  ValidationSeverity,
  Validation,
  TreePathNode
} from '../models/schema-node.model';

@Injectable({
  providedIn: 'root'
})
export class SchemaService {
  private readonly storageKey = 'mongodb-schema-config.datasources';
  private readonly masterModelStorageKey = 'mongodb-schema-config.master-model';
  private selectedNodeSubject = new BehaviorSubject<SchemaNode | null>(null);
  private selectedMasterNodeSubject = new BehaviorSubject<TreePathNode | null>(null);
  private datasourcesSubject = new BehaviorSubject<Datasource[]>([]);
  private masterPathSuggestionsSubject = new BehaviorSubject<string[]>([]);
  private masterPathTreeSubject = new BehaviorSubject<TreePathNode[]>([]);
  private savedDatasourcesSubject = new BehaviorSubject<Datasource[]>([]);
  private savedJsonSubject = new BehaviorSubject<string>('{}');
  private schemaValidationSubject = new BehaviorSubject<SchemaValidationResult>({ isValid: true, errors: [] });

  public selectedNode$ = this.selectedNodeSubject.asObservable();
  public selectedMasterNode$ = this.selectedMasterNodeSubject.asObservable();
  public datasources$ = this.datasourcesSubject.asObservable();
  public masterPathSuggestions$ = this.masterPathSuggestionsSubject.asObservable();
  public masterPathTree$ = this.masterPathTreeSubject.asObservable();
  public savedDatasources$ = this.savedDatasourcesSubject.asObservable();
  public savedJson$ = this.savedJsonSubject.asObservable();
  public schemaValidation$ = this.schemaValidationSubject.asObservable();

  constructor() {
    this.initializeMasterPathSuggestions();
    this.initializeSampleData();
    this.loadSavedDatasources();
  }

  private initializeMasterPathSuggestions(): void {
    const savedMasterTree = this.loadMasterPathTree();

    if (savedMasterTree.length > 0) {
      this.publishMasterTree(savedMasterTree);
      return;
    }

    const masterRecordModel = {
      DocumentDetails: {
        RegistrationNumber: '',
        Receiving: '',
        ReceiptDateAndTime: '',
        IndustryClassificationCode: '',
        CompanyType: '',
        DocumentID: '',
        DocumentType: '',
        DocumentCode: '',
        PeriodCovered: '',
        SubmissionType: '',
        Remarks: '',
        Instructions: null,
        Note: ''
      },
      BasicInformation: {
        RegistrationNumber: '',
        CompanyName: '',
        TradeName: [''],
        GISYear: '',
        CountryWhereOrganised: null,
        FiscalYearEnd: '',
        StampDate: '',
        StampPlace: '',
        ReceiptDate: '',
        Instructions: '',
        Note: ''
      },
      KYC: {
        RegistrationNumber: '',
        AMLAData: {
          SectionA: {
            IsCoveredPerson: 0,
            FinancialInstitutions: {
              Banks: 0,
              OffshoreBankingUnits: 0
            },
            DescribeNatureOfBusiness: ''
          },
          SectionB: {
            HasCorporationCompliedWithCDDKYCRecordKeepingAndReporting: 0
          }
        }
      },
      GeneralInformation: {
        RegistrationNumber: '',
        DateOfAnnualMeetingPerByLaws: '',
        ActualDateOfAnnualMeeting: '',
        NameOfExternalAuditorAndItsSigningPartner: ['', ''],
        SecAccreditationNumber: '',
        GeographicalCode: '',
        SecRegistrationNumber: '',
        TotalSecuritiesDeposited: {
          TotalAmount: null,
          CurrencyCode: null,
          CurrencyDescription: null,
          UnitOfSize: null,
          TypesOfSecurities: []
        }
      },
      Classifications: {
        RegistrationNumber: '',
        Classification: '',
        Type: null,
        SubType: []
      },
      Address: [
        {
          AddressType: '',
          RegistrationNumber: '',
          BuildingRoomNo: null,
          BuildingFloorNo: '',
          PostalCode: '',
          Town: '',
          State: '',
          Country: '',
          StreetNumber: '',
          Building: '',
          StreetName: '',
          District: ''
        }
      ],
      TelephoneContact: {
        RegistrationNumber: '',
        Telephone: [
          {
            TelephoneAreaCode: '',
            TelephoneNo: ''
          }
        ],
        Mobile: [
          {
            MobileNo: ''
          }
        ],
        Fax: [],
        Website: [],
        Email: [
          {
            OfficialEmail: ''
          },
          {
            AlternateEmail: ''
          }
        ]
      },
      Registration: {
        RegistrationNumber: '',
        TaxIdentificationCode: '',
        SECRegistrationNumber: '',
        SECRegistrationDate: '',
        DateOfIssuanceOfSecLicense: null
      },
      EconomicActivities: {
        RegistrationNumber: '',
        LineOfBusiness: '',
        IndustryClassificationCode: '',
        IndustryClassificationDescription: '',
        SicClassification: '',
        BusinessStatedInSec: null
      },
      Equity: [
        {
          RegistrationNumber: '',
          EquityTypeCode: '',
          EquityTypeDescription: '',
          EquityAmount: 0,
          Currency: '',
          SingleShareValue: 0
        }
      ],
      Employees: {
        RegistrationNumber: '',
        TotalEmployeesQuantity: 0
      },
      Managers: {
        ManagerData: [
          {
            manager_no: 0,
            RegistrationNumber: '',
            Gender: '',
            Name: '',
            MiddleName: '',
            Surname: '',
            Nationality: '',
            Address: '',
            Incorporator: 0,
            BoardDirector: '',
            TaxIdentificationCode: '',
            OfficerPosition: [
              {
                OfficerPositionCode: '',
                OfficerPositionDescription: ''
              }
            ],
            ExecutiveCommittee: ['']
          }
        ]
      },
      Shareholders: {
        ShareholderData: [
          {
            shareholder_no: 0,
            RegistrationNumber: '',
            IsShareholderCompany: 0,
            CompanyName: null,
            Name: null,
            MiddleName: null,
            Surname: null,
            Country: '',
            TaxIdentificationNumber: '',
            Address: null,
            Shares: [
              {
                SharesTypeCode: '',
                SharesTypeDescription: '',
                SharesNumber: 0,
                CurrencyCode: '',
                CurrencyDescription: '',
                ShareAmount: 0,
                SharePercentage: 0,
                PaidSharesNumber: 0,
                PaidShareAmount: 0,
                PaidCurrencyCode: '',
                PaidCurrencyDescription: ''
              }
            ]
          }
        ]
      },
      ShareholderList: {
        RegistrationNumber: '',
        TotalShareholderNumber: 0,
        TotalShareholderAmount: 0,
        TotalShareholdersWithHundredPlusShares: 0,
        ShareholdersListDateOfStartValidity: ''
      },
      Capital: {
        RegistrationNumber: '',
        AuthorisedCapitalAmount: 0,
        AuthorisedCapitalCurrency: '',
        PaidUpCapitalAmount: 0,
        PaidUpCapitalCurrency: ''
      },
      CapitalData: {
        RegistrationNumber: '',
        CapitalDetails: [
          {
            CapitalTypeCode: '',
            CapitalTypeDescription: '',
            TotalCapital: [
              {
                SharesNumber: 0,
                ParValue: 0,
                ShareAmount: 0,
                ShareCurrencyCode: '',
                ShareCurrencyDescription: ''
              }
            ],
            Details: [
              {
                ShareTypeCode: '',
                ShareTypeDescription: '',
                NumberOfShareholders: null,
                SharesNumber: 0,
                ParValue: 0,
                ShareAmount: 0,
                ShareCurrencyCode: '',
                ShareCurrencyDescription: '',
                NationalityCode: null,
                NationalityDescription: null,
                PercentageOwnership: 0
              }
            ]
          }
        ]
      },
      RelatedCompanies: {
        RelatedCompanyData: [
          {
            RegistrationNumber: '',
            RelationType: '',
            CompanyName: '',
            SECRegistrationNumber: null,
            Country: '',
            State: '',
            District: '',
            Town: '',
            StreetName: '',
            StreetNumber: '',
            Building: '',
            BuildingFloorNo: '',
            BuildingRoomNo: null,
            PostalCode: ''
          }
        ]
      },
      OtherInformation: {
        RegistrationNumber: '',
        InvestmentOfCorpFundsInAnotherCorp: [
          {
            Type: '',
            Description: null,
            Amount: null,
            UnitOfSizeCode: null,
            UnitOfSizeDescription: null,
            CurrencyCode: '',
            CurrencyDescription: '',
            DateofBoardResolution: null
          }
        ],
        UnrestrictedOrUnappropriatedRetainedEarningAsOfLastFY: {
          Amount: 0,
          CurrencyCode: '',
          CurrencyDescription: ''
        },
        DividendsDeclaredDuringthePrecedingYear: {
          DividendDate: null,
          TypeOfDividend: [
            {
              DividendType: '',
              Description: null,
              Amount: null,
              CurrencyCode: '',
              CurrencyDescription: '',
              DateDeclared: []
            }
          ]
        },
        SecondaryLicenseOrRegistrationWithSecAndOtherGovtAgency: [
          {
            NameOfAgency: '',
            TypeOfLicenseOrRegn: null,
            DateIssued: [],
            DateStartedOperations: []
          }
        ],
        TotalNumberOfOfficers: {
          Date: null,
          NumberOfEmployees: 0
        },
        TotalNumberOfRankAndFileEmployees: {
          Date: null,
          NumberOfEmployees: 0
        },
        TotalManpowerComplement: {
          Date: null,
          NumberOfEmployees: 0
        }
      }
    };

    const tree = this.buildMasterPathTree(masterRecordModel, '');
    this.publishMasterTree(tree);
  }

  addMasterNode(parentPath: string | null, nodeType: 'FIELD' | 'OBJECT' | 'ARRAY'): void {
    const currentTree = this.cloneMasterTree(this.masterPathTreeSubject.getValue());
    const parentNode = parentPath ? this.findMasterNode(currentTree, parentPath) : null;

    if (parentPath && !parentNode) {
      return;
    }

    if (parentNode && !this.canAddChildrenToMasterNode(parentNode)) {
      return;
    }

    const siblings = parentNode ? parentNode.children : currentTree;
    const newNode = this.createMasterNode(nodeType, this.getUniqueMasterKey(siblings, this.getDefaultMasterKey(nodeType)));
    siblings.push(newNode);

    if (parentNode?.key === '[*]') {
      parentNode.isLeaf = false;
    }

    this.publishMasterTree(currentTree);
  }

  selectMasterNode(fullPath: string): void {
    const node = this.findMasterNode(this.masterPathTreeSubject.getValue(), fullPath);
    this.selectedMasterNodeSubject.next(node ? this.cloneMasterNode(node) : null);
  }

  getSelectedMasterNode(): TreePathNode | null {
    return this.selectedMasterNodeSubject.getValue();
  }

  getMasterPathTree(): TreePathNode[] {
    return this.masterPathTreeSubject.getValue();
  }

  updateMasterNodeProfile(fullPath: string, updates: Partial<MasterNodeProfile> & { key?: string }): void {
    const currentTree = this.cloneMasterTree(this.masterPathTreeSubject.getValue());
    const node = this.findMasterNode(currentTree, fullPath);

    if (!node) {
      return;
    }

    const nextKey = this.toStringValue(updates.key).trim();
    const { key: _, ...profileUpdates } = updates;

    if (nextKey && nextKey !== node.key && node.key !== '[*]') {
      node.key = nextKey;
    }

    this.ensureMasterNodeProfile(node);

    if (profileUpdates.fieldName !== undefined) {
      node.profile!.fieldName = this.toStringValue(profileUpdates.fieldName);
    }

    if (profileUpdates.displayName !== undefined) {
      node.profile!.displayName = this.toStringValue(profileUpdates.displayName);
    }

    if (profileUpdates.dataType !== undefined) {
      node.profile!.dataType = profileUpdates.dataType;
    }

    if (profileUpdates.description !== undefined) {
      node.profile!.description = this.toStringValue(profileUpdates.description);
    }

    if (profileUpdates.pk !== undefined) {
      node.profile!.pk = this.toStringValue(profileUpdates.pk);
    }

    if (profileUpdates.sk !== undefined) {
      node.profile!.sk = this.toStringValue(profileUpdates.sk);
    }

    if (profileUpdates.sourcePath !== undefined) {
      node.profile!.sourcePath = this.toStringValue(profileUpdates.sourcePath);
    }

    if (profileUpdates.targetPath !== undefined) {
      node.profile!.targetPath = this.toStringValue(profileUpdates.targetPath);
    }

    if (profileUpdates.valueMode !== undefined) {
      node.profile!.valueMode = profileUpdates.valueMode;
    }

    if (profileUpdates.defaultValue !== undefined) {
      node.profile!.defaultValue = profileUpdates.defaultValue;
    }

    if (profileUpdates.validationRules !== undefined) {
      node.profile!.validationRules = profileUpdates.validationRules.map(rule => ({ ...rule }));
    }

    if (profileUpdates.businessValidations !== undefined) {
      node.profile!.businessValidations = [...profileUpdates.businessValidations];
    }

    if (profileUpdates.crossFieldValidations !== undefined) {
      node.profile!.crossFieldValidations = profileUpdates.crossFieldValidations.map(validation => ({ ...validation }));
    }

    if (profileUpdates.possibleValues !== undefined) {
      node.profile!.possibleValues = [...profileUpdates.possibleValues];
    }

    if (profileUpdates.transformations !== undefined) {
      node.profile!.transformations = [...profileUpdates.transformations];
    }

    if (profileUpdates.isPii !== undefined) {
      node.profile!.isPii = profileUpdates.isPii;
    }

    if (profileUpdates.similarFields !== undefined) {
      node.profile!.similarFields = [...profileUpdates.similarFields];
    }

    const selectedPath = nextKey && nextKey !== '[*]'
      ? this.replaceLastMasterPathSegment(fullPath, nextKey)
      : fullPath;

    this.publishMasterTree(currentTree, selectedPath);
  }

  private ensureMasterNodeProfile(node: TreePathNode): void {
    node.profile = this.normalizeMasterNodeProfile(node.profile, node);
  }

  deleteMasterNode(fullPath: string): void {
    const currentTree = this.cloneMasterTree(this.masterPathTreeSubject.getValue());

    if (!this.removeMasterNode(currentTree, fullPath)) {
      return;
    }

    const selectedMasterNode = this.selectedMasterNodeSubject.getValue();
    this.publishMasterTree(currentTree, selectedMasterNode?.fullPath === fullPath ? null : undefined);
  }

  canAddChildrenToMasterNode(node: TreePathNode): boolean {
    if (node.key === '[*]') {
      return true;
    }

    return !node.isLeaf && !this.isArrayContainerNode(node);
  }

  private collectMasterPaths(value: unknown, currentPath: string, suggestionSet: Set<string>): void {
    if (currentPath) {
      suggestionSet.add(currentPath);
    }

    if (Array.isArray(value)) {
      const arrayPath = `${currentPath}[*]`;
      suggestionSet.add(arrayPath);

      if (value.length > 0) {
        this.collectMasterPaths(value[0], arrayPath, suggestionSet);
      }
      return;
    }

    if (this.isPlainObject(value)) {
      Object.entries(value).forEach(([key, nestedValue]) => {
        const nextPath = currentPath ? `${currentPath}.${key}` : key;
        this.collectMasterPaths(nestedValue, nextPath, suggestionSet);
      });
    }
  }

  private buildMasterPathTree(value: unknown, currentPath: string): TreePathNode[] {
    const nodes: TreePathNode[] = [];

    if (Array.isArray(value)) {
      // For arrays, create an [*] entry and recurse into first element
      if (value.length > 0) {
        const arrayPath = `${currentPath}[*]`;
        const arrayNode: TreePathNode = {
          key: '[*]',
          fullPath: arrayPath,
          isArray: true,
          isLeaf: true,
          children: this.buildMasterPathTree(value[0], arrayPath),
          expanded: false
        };
        nodes.push(arrayNode);
      }
      return nodes;
    }

    if (this.isPlainObject(value)) {
      Object.entries(value).forEach(([key, nestedValue]) => {
        const nextPath = currentPath ? `${currentPath}.${key}` : key;
        
        if (Array.isArray(nestedValue)) {
          const arrayPath = `${nextPath}[*]`;
          const children = nestedValue.length > 0 ? this.buildMasterPathTree(nestedValue[0], arrayPath) : [];
          
          nodes.push({
            key: key,
            fullPath: nextPath,
            isArray: false,
            isLeaf: false,
            children: [
              {
                key: '[*]',
                fullPath: arrayPath,
                isArray: true,
                isLeaf: children.length === 0,
                children: children,
                expanded: false
              }
            ],
            expanded: false
          });
        } else if (this.isPlainObject(nestedValue)) {
          // Recurse into nested objects
          const children = this.buildMasterPathTree(nestedValue, nextPath);
          nodes.push({
            key: key,
            fullPath: nextPath,
            isArray: false,
            isLeaf: false,
            children: children,
            expanded: false
          });
        } else {
          // Leaf node (scalar value)
          nodes.push({
            key: key,
            fullPath: nextPath,
            isArray: false,
            isLeaf: true,
            children: [],
            expanded: false
          });
        }
      });
    }

    return nodes;
  }

  private publishMasterTree(tree: TreePathNode[], selectedFullPath?: string | null): void {
    const normalizedTree = this.rebuildMasterTreePaths(this.cloneMasterTree(tree), '');
    const suggestionSet = new Set<string>();

    this.collectMasterPathsFromTree(normalizedTree, suggestionSet);
    this.masterPathTreeSubject.next(normalizedTree);
    this.masterPathSuggestionsSubject.next(Array.from(suggestionSet).sort());

    try {
      localStorage.setItem(this.masterModelStorageKey, JSON.stringify(normalizedTree));
    } catch {
      // In-memory state remains updated.
    }

    const currentSelectedNode = this.selectedMasterNodeSubject.getValue();
    const selectedPath = selectedFullPath === undefined ? currentSelectedNode?.fullPath : selectedFullPath;
    this.selectedMasterNodeSubject.next(
      selectedPath ? this.cloneMasterNode(this.findMasterNode(normalizedTree, selectedPath)) : null
    );
  }

  private collectMasterPathsFromTree(nodes: TreePathNode[], suggestionSet: Set<string>): void {
    nodes.forEach(node => {
      if (node.fullPath) {
        suggestionSet.add(node.fullPath);
      }

      if (node.children.length > 0) {
        this.collectMasterPathsFromTree(node.children, suggestionSet);
      }
    });
  }

  private rebuildMasterTreePaths(nodes: TreePathNode[], parentPath: string): TreePathNode[] {
    return nodes.map(node => {
      const fullPath = node.key === '[*]'
        ? `${parentPath}[*]`
        : parentPath
          ? `${parentPath}.${node.key}`
          : node.key;
      const children = this.rebuildMasterTreePaths(node.children, fullPath);

      return {
        ...node,
        fullPath,
        children,
        isLeaf: node.key === '[*]' ? children.length === 0 : node.isLeaf,
        profile: this.normalizeMasterNodeProfile(node.profile, {
          ...node,
          fullPath,
          children,
          isLeaf: node.key === '[*]' ? children.length === 0 : node.isLeaf
        })
      };
    });
  }

  private normalizeMasterNodeProfile(profile: MasterNodeProfile | undefined, node: TreePathNode): MasterNodeProfile {
    const defaultDataType = this.getMasterNodeDefaultDataType(node);

    return {
      pk: profile?.pk || '',
      sk: profile?.sk || '',
      fieldPath: node.fullPath,
      fieldName: profile?.fieldName || this.toMasterFieldName(node.key),
      displayName: profile?.displayName || this.toMasterDisplayName(node.key),
      dataType: profile?.dataType || defaultDataType,
      sourcePath: profile?.sourcePath || node.fullPath,
      targetPath: profile?.targetPath || node.fullPath,
      validationRules: profile?.validationRules?.map(rule => ({ ...rule })) || [
        {
          Rule: 'NOT_EMPTY',
          Severity: 'Error',
          Message: 'Value is required'
        }
      ],
      businessValidations: profile?.businessValidations ? [...profile.businessValidations] : ['MANDATORY_CHECK'],
      crossFieldValidations: profile?.crossFieldValidations ? profile.crossFieldValidations.map(validation => ({ ...validation })) : [],
      valueMode: profile?.valueMode || 'DEFAULT',
      defaultValue: profile?.defaultValue ?? null,
      possibleValues: profile?.possibleValues ? [...profile.possibleValues] : [],
      transformations: profile?.transformations ? [...profile.transformations] : [],
      isPii: profile?.isPii ?? false,
      similarFields: profile?.similarFields ? [...profile.similarFields] : [],
      description: profile?.description || ''
    };
  }

  private cloneMasterNode(node: TreePathNode | null): TreePathNode | null {
    if (!node) {
      return null;
    }

    return {
      ...node,
      profile: node.profile ? { ...node.profile } : undefined,
      children: this.cloneMasterTree(node.children)
    };
  }

  private cloneMasterTree(nodes: TreePathNode[]): TreePathNode[] {
    return nodes.map(node => ({
      ...node,
      profile: node.profile ? { ...node.profile } : undefined,
      children: this.cloneMasterTree(node.children)
    }));
  }

  private findMasterNode(nodes: TreePathNode[], fullPath: string): TreePathNode | null {
    for (const node of nodes) {
      if (node.fullPath === fullPath) {
        return node;
      }

      const childNode = this.findMasterNode(node.children, fullPath);

      if (childNode) {
        return childNode;
      }
    }

    return null;
  }

  private removeMasterNode(nodes: TreePathNode[], fullPath: string): boolean {
    const nodeIndex = nodes.findIndex(node => node.fullPath === fullPath);

    if (nodeIndex >= 0) {
      nodes.splice(nodeIndex, 1);
      return true;
    }

    return nodes.some(node => {
      const removed = this.removeMasterNode(node.children, fullPath);

      if (removed && node.key === '[*]') {
        node.isLeaf = node.children.length === 0;
      }

      return removed;
    });
  }

  private createMasterNode(nodeType: 'FIELD' | 'OBJECT' | 'ARRAY', key: string): TreePathNode {
    if (nodeType === 'FIELD') {
      return {
        key,
        fullPath: key,
        isArray: false,
        isLeaf: true,
        children: []
      };
    }

    if (nodeType === 'ARRAY') {
      return {
        key,
        fullPath: key,
        isArray: false,
        isLeaf: false,
        children: [
          {
            key: '[*]',
            fullPath: `${key}[*]`,
            isArray: true,
            isLeaf: true,
            children: []
          }
        ]
      };
    }

    return {
      key,
      fullPath: key,
      isArray: false,
      isLeaf: false,
      children: []
    };
  }

  private getDefaultMasterKey(nodeType: 'FIELD' | 'OBJECT' | 'ARRAY'): string {
    switch (nodeType) {
      case 'FIELD':
        return 'NewField';
      case 'OBJECT':
        return 'NewObject';
      case 'ARRAY':
        return 'NewArray';
    }
  }

  private getUniqueMasterKey(siblings: TreePathNode[], baseKey: string): string {
    const existingKeys = new Set(siblings.filter(node => node.key !== '[*]').map(node => node.key.toLowerCase()));

    if (!existingKeys.has(baseKey.toLowerCase())) {
      return baseKey;
    }

    let suffix = 2;
    let nextKey = `${baseKey}${suffix}`;

    while (existingKeys.has(nextKey.toLowerCase())) {
      suffix += 1;
      nextKey = `${baseKey}${suffix}`;
    }

    return nextKey;
  }

  private isArrayContainerNode(node: TreePathNode): boolean {
    return node.children.some(child => child.key === '[*]');
  }

  private getMasterNodeDefaultDataType(node: TreePathNode): SchemaNode['dataType'] {
    if (node.key === '[*]' || this.isArrayContainerNode(node)) {
      return 'ARRAY';
    }

    if (!node.isLeaf) {
      return 'OBJECT';
    }

    return 'STRING';
  }

  private toMasterFieldName(key: string): string {
    return key === '[*]' ? 'ArrayItem' : key.replace(/[^A-Za-z0-9]+/g, ' ').trim().replace(/\s+(.)/g, (_, letter) => letter.toUpperCase()).replace(/^(.)/, (_, first) => first.toUpperCase());
  }

  private toMasterDisplayName(key: string): string {
    if (key === '[*]') {
      return 'Array Item';
    }

    return key
      .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
      .replace(/[_-]+/g, ' ')
      .trim() || key;
  }

  private replaceLastMasterPathSegment(fullPath: string, nextKey: string): string {
    const segments = fullPath.split('.');
    segments[segments.length - 1] = nextKey;
    return segments.join('.');
  }

  private initializeSampleData(): void {
    const companyAddress: SchemaNode = {
      id: '3',
      name: 'Company Address',
      code: 'COMP_ADDR',
      nodeType: 'ARRAY',
      dataType: 'OBJECT',
      sourceMapping: '$.basicInfo.address',
      destinationMapping: 'company.address',
      validations: [{ id: '1', type: 'MANDATORY' }],
      businessRules: [{ id: '1', code: 'BR001' }],
      transformations: [{ id: '1', type: 'ALL_CAPS' }],
      children: [
        {
          id: '3-1',
          name: 'Line1',
          code: 'LINE1',
          nodeType: 'FIELD',
          dataType: 'STRING',
          sourceMapping: '$.basicInfo.address.line1',
          destinationMapping: 'company.address.line1',
          validations: [],
          businessRules: [],
          transformations: [],
          children: []
        },
        {
          id: '3-2',
          name: 'City',
          code: 'CITY',
          nodeType: 'FIELD',
          dataType: 'STRING',
          sourceMapping: '$.basicInfo.address.city',
          destinationMapping: 'company.address.city',
          validations: [],
          businessRules: [],
          transformations: [],
          children: []
        },
        {
          id: '3-3',
          name: 'Pin',
          code: 'PIN',
          nodeType: 'FIELD',
          dataType: 'STRING',
          sourceMapping: '$.basicInfo.address.pin',
          destinationMapping: 'company.address.pin',
          validations: [],
          businessRules: [],
          transformations: [],
          children: []
        }
      ]
    };

    const sampleDatasource: Datasource = {
      id: '1',
      name: 'Datasource-1',
      sourceType: 'JSON',
      status: 'ACTIVE',
      pkPattern: '',
      profileReviewStatus: 'PENDING',
      reviewComments: [
        {
          id: 'review-1',
          action: 'REQUEST_CHANGES',
          comment: 'Verify source mappings and validation rules before final approval.',
          createdAt: new Date().toISOString()
        }
      ],
      nodes: [
        {
          id: '1',
          name: 'Company Name',
          code: 'COMP_NAME',
          nodeType: 'FIELD',
          dataType: 'STRING',
          sourceMapping: '$.basicInfo.companyName',
          destinationMapping: 'company.name',
          validations: [],
          businessRules: [],
          transformations: [],
          children: []
        },
        companyAddress,
        {
          id: '2',
          name: 'Employee',
          code: 'EMP',
          nodeType: 'ARRAY',
          dataType: 'OBJECT',
          sourceMapping: '$.employees',
          destinationMapping: 'employees',
          validations: [],
          businessRules: [],
          transformations: [],
          children: []
        }
      ]
    };

    this.datasourcesSubject.next([sampleDatasource]);
    this.publishValidation();
  }

  selectNode(node: SchemaNode): void {
    this.ensureFieldProfile(node);
    this.selectedNodeSubject.next(node);
  }

  updateDatasourceDetails(datasourceId: string, updates: Partial<Pick<Datasource, 'name' | 'sourceType' | 'status' | 'pkPattern'>>): void {
    const datasources = this.datasourcesSubject.getValue();
    const datasource = datasources.find(item => item.id === datasourceId);

    if (!datasource) {
      return;
    }

    datasource.name = updates.name ?? datasource.name;
    datasource.sourceType = updates.sourceType ?? datasource.sourceType;
    datasource.status = updates.status ?? datasource.status;
    datasource.pkPattern = updates.pkPattern ?? datasource.pkPattern;

    this.datasourcesSubject.next([...datasources]);
    this.publishValidation();
  }

  updateDatasourceReview(datasourceId: string, action: ProfileReviewAction, comment: string): void {
    const datasources = this.datasourcesSubject.getValue();
    const datasource = datasources.find(item => item.id === datasourceId);

    if (!datasource) {
      return;
    }

    datasource.profileReviewStatus = this.mapReviewActionToStatus(action);

    const normalizedComment = comment.trim();
    datasource.reviewComments = [
      {
        id: `review-${Date.now()}`,
        action,
        comment: normalizedComment,
        createdAt: new Date().toISOString()
      },
      ...datasource.reviewComments
    ];

    this.datasourcesSubject.next([...datasources]);
  }

  getSelectedNode(): SchemaNode | null {
    return this.selectedNodeSubject.getValue();
  }

  addChild(parent: SchemaNode, child: SchemaNode): void {
    if (!this.canHaveChildren(parent)) {
      return;
    }

    this.ensureFieldProfile(child);
    child.parent = parent;
    parent.children.push(child);
    this.datasourcesSubject.next([...this.datasourcesSubject.getValue()]);
    this.publishValidation();
    this.selectedNodeSubject.next(parent);
  }

  removeChild(parent: SchemaNode, childId: string): void {
    parent.children = parent.children.filter(c => c.id !== childId);
    this.datasourcesSubject.next([...this.datasourcesSubject.getValue()]);
    this.publishValidation();
  }

  saveDatasources(): boolean {
    const validation = this.validateDatasources(this.datasourcesSubject.getValue());
    this.schemaValidationSubject.next(validation);

    if (!validation.isValid) {
      return false;
    }

    const snapshot = this.createPersistableSnapshot(this.datasourcesSubject.getValue());
    const generatedJson = JSON.stringify(this.generateFieldProfileJson(snapshot), null, 2);

    try {
      localStorage.setItem(this.storageKey, JSON.stringify(snapshot));
    } catch {
      // Memory fallback is still updated below.
    }

    this.savedDatasourcesSubject.next(snapshot);
    this.savedJsonSubject.next(generatedJson);
    return true;
  }

  exportProfileJson(): string {
    const datasources = this.createPersistableSnapshot(this.datasourcesSubject.getValue());
    const exportPayload: SchemaProfileExport = {
      version: 1,
      exportedAt: new Date().toISOString(),
      datasources,
      fieldProfiles: this.generateFieldProfileJson(datasources)
    };

    return JSON.stringify(exportPayload, null, 2);
  }

  importProfileJson(jsonText: string): SchemaValidationResult {
    let parsedValue: unknown;

    try {
      parsedValue = JSON.parse(jsonText);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid JSON.';
      return { isValid: false, errors: [`Invalid JSON: ${message}`] };
    }

    const normalizedResult = this.normalizeImportedDatasources(parsedValue);

    if (!normalizedResult.isValid || !normalizedResult.datasources) {
      return {
        isValid: false,
        errors: normalizedResult.errors
      };
    }

    const validation = this.validateDatasources(normalizedResult.datasources);

    if (!validation.isValid) {
      return validation;
    }

    const importedSnapshot = this.createPersistableSnapshot(normalizedResult.datasources);

    try {
      localStorage.setItem(this.storageKey, JSON.stringify(importedSnapshot));
    } catch {
      // Memory state is still updated below.
    }

    this.datasourcesSubject.next(importedSnapshot);
    this.selectedNodeSubject.next(null);
    this.savedDatasourcesSubject.next(importedSnapshot);
    this.savedJsonSubject.next(JSON.stringify(this.generateFieldProfileJson(importedSnapshot), null, 2));
    this.schemaValidationSubject.next(validation);

    return validation;
  }

  deleteNode(nodeId: string): void {
    const datasources = this.datasourcesSubject.getValue();
    const selectedNode = this.selectedNodeSubject.getValue();
    const nodeToDelete = this.findNodeById(nodeId, datasources);

    if (!nodeToDelete) {
      return;
    }

    datasources.forEach(datasource => {
      datasource.nodes = datasource.nodes.filter(node => node.id !== nodeId);
      datasource.nodes.forEach(node => this.removeNodeFromChildren(node, nodeId));
    });

    this.datasourcesSubject.next([...datasources]);
    this.publishValidation();

    if (selectedNode && this.containsNode(nodeToDelete, selectedNode.id)) {
      this.selectedNodeSubject.next(null);
    }
  }

  updateNode(node: SchemaNode): void {
    this.ensureFieldProfile(node);
    this.selectedNodeSubject.next(node);
    this.datasourcesSubject.next([...this.datasourcesSubject.getValue()]);
    this.publishValidation();
  }

  canHaveChildren(node: SchemaNode): boolean {
    return node.nodeType === 'OBJECT' || node.nodeType === 'ARRAY';
  }

  ensureFieldProfile(node: SchemaNode): void {
    if (node.nodeType !== 'FIELD') {
      return;
    }

    if (!node.fieldProfile) {
      node.fieldProfile = this.createDefaultFieldProfile(node);
      return;
    }

    node.fieldProfile.FieldName = node.fieldProfile.FieldName || this.toFieldName(node.name);
    node.fieldProfile.DisplayName = node.fieldProfile.DisplayName || node.name;
    node.fieldProfile.DataType = node.fieldProfile.DataType || node.dataType;
    node.fieldProfile.Validation = node.fieldProfile.Validation || { Type: 'STRUCTURAL', Rules: [] };
    node.fieldProfile.Validation.Rules = node.fieldProfile.Validation.Rules || [];
    node.fieldProfile.Validation.Rules.forEach(rule => {
      rule.Severity = this.normalizeSeverity(rule.Severity);
    });
    node.fieldProfile.IsPII = !!node.fieldProfile.IsPII;
    node.fieldProfile.SimilarFields = Array.isArray(node.fieldProfile.SimilarFields) ? node.fieldProfile.SimilarFields : [];
    node.fieldProfile.Description = node.fieldProfile.Description || '';
    node.fieldProfile.BusinessValidations = Array.isArray(node.fieldProfile.BusinessValidations) ? node.fieldProfile.BusinessValidations : [];
    node.fieldProfile.CrossFieldValidations = Array.isArray(node.fieldProfile.CrossFieldValidations)
      ? node.fieldProfile.CrossFieldValidations
      : [];
    node.fieldProfile.CrossFieldValidations.forEach(crossFieldValidation => {
      crossFieldValidation.FieldPath = this.toStringValue(crossFieldValidation.FieldPath);
      crossFieldValidation.Rule = this.toStringValue(crossFieldValidation.Rule);
      crossFieldValidation.Severity = this.normalizeSeverity(crossFieldValidation.Severity);
    });
    node.fieldProfile.SourceMapping = this.normalizeSourceMapping(node.fieldProfile.SourceMapping, node);
    node.fieldProfile.ValueMode = this.normalizeValueMode(node.fieldProfile.ValueMode);
    node.fieldProfile.PossibleValues = Array.isArray(node.fieldProfile.PossibleValues) ? node.fieldProfile.PossibleValues : [];
    node.fieldProfile.Transformations = node.fieldProfile.Transformations || [];
  }

  getUniqueNodeName(siblings: SchemaNode[], baseName: string): string {
    const existingNames = new Set(siblings.map(node => node.name.trim().toLowerCase()));

    if (!existingNames.has(baseName.toLowerCase())) {
      return baseName;
    }

    let suffix = 2;
    let nextName = `${baseName} ${suffix}`;

    while (existingNames.has(nextName.toLowerCase())) {
      suffix += 1;
      nextName = `${baseName} ${suffix}`;
    }

    return nextName;
  }

  private loadSavedDatasources(): void {
    try {
      const savedValue = localStorage.getItem(this.storageKey);
      if (savedValue) {
        const savedDatasources = JSON.parse(savedValue) as Datasource[];
        this.savedDatasourcesSubject.next(savedDatasources);
        this.savedJsonSubject.next(JSON.stringify(this.generateFieldProfileJson(savedDatasources), null, 2));
      }
    } catch {
      this.savedDatasourcesSubject.next([]);
      this.savedJsonSubject.next('{}');
    }
  }

  private loadMasterPathTree(): TreePathNode[] {
    try {
      const savedValue = localStorage.getItem(this.masterModelStorageKey);

      if (!savedValue) {
        return [];
      }

      const parsedValue = JSON.parse(savedValue);
      return Array.isArray(parsedValue) ? this.cloneMasterTree(parsedValue as TreePathNode[]) : [];
    } catch {
      return [];
    }
  }

  private publishValidation(): void {
    this.schemaValidationSubject.next(this.validateDatasources(this.datasourcesSubject.getValue()));
  }

  private normalizeImportedDatasources(value: unknown): { isValid: boolean; errors: string[]; datasources?: Datasource[] } {
    if (this.isPlainObject(value) && Array.isArray((value as { datasources?: unknown }).datasources)) {
      return this.normalizeDatasourceArray((value as { datasources: unknown[] }).datasources);
    }

    if (Array.isArray(value)) {
      if (value.every(item => this.isPlainObject(item) && Array.isArray((item as { nodes?: unknown }).nodes))) {
        return this.normalizeDatasourceArray(value);
      }

      if (value.every(item => this.isPlainObject(item) && this.looksLikeFieldProfile(item))) {
        return this.normalizeFieldProfiles(value);
      }
    }

    if (this.isPlainObject(value) && Array.isArray((value as { fieldProfiles?: unknown }).fieldProfiles)) {
      return this.normalizeFieldProfiles((value as { fieldProfiles: unknown[] }).fieldProfiles);
    }

    return {
      isValid: false,
      errors: ['Import JSON must be an export object with datasources, a datasource array, or a field profile array.']
    };
  }

  private normalizeDatasourceArray(value: unknown[]): { isValid: boolean; errors: string[]; datasources?: Datasource[] } {
    const errors: string[] = [];
    const datasources = value.map((item, index) => this.normalizeDatasource(item, index, errors));

    return {
      isValid: errors.length === 0,
      errors,
      datasources: errors.length === 0 ? datasources : undefined
    };
  }

  private normalizeDatasource(value: unknown, index: number, errors: string[]): Datasource {
    const datasource = this.toRecord(value);
    const nodes = Array.isArray(datasource['nodes'])
      ? datasource['nodes'].map((node, nodeIndex) => this.normalizeNode(node, `datasources[${index}].nodes[${nodeIndex}]`, errors))
      : [];

    if (!Array.isArray(datasource['nodes'])) {
      errors.push(`datasources[${index}].nodes must be an array.`);
    }

    return {
      id: this.toStringValue(datasource['id']) || `imported-datasource-${index + 1}`,
      name: this.toStringValue(datasource['name']) || `Imported Datasource ${index + 1}`,
      sourceType: this.normalizeSourceType(datasource['sourceType']),
      status: this.normalizeDatasourceStatus(datasource['status']),
      pkPattern: this.toStringValue(datasource['pkPattern']),
      profileReviewStatus: this.normalizeProfileReviewStatus(datasource['profileReviewStatus']),
      reviewComments: this.normalizeReviewComments(datasource['reviewComments']),
      nodes
    };
  }

  private normalizeNode(value: unknown, path: string, errors: string[]): SchemaNode {
    const node = this.toRecord(value);
    const nodeType = this.normalizeNodeType(node['nodeType'], path, errors);
    const dataType = this.normalizeDataType(node['dataType'], nodeType, path, errors);
    const children = Array.isArray(node['children'])
      ? node['children'].map((child, index) => this.normalizeNode(child, `${path}.children[${index}]`, errors))
      : [];

    if (!Array.isArray(node['children'])) {
      errors.push(`${path}.children must be an array.`);
    }

    const normalizedNode: SchemaNode = {
      id: this.toStringValue(node['id']) || `${path}-${Date.now()}`,
      name: this.toStringValue(node['name']),
      code: this.toStringValue(node['code']),
      nodeType,
      dataType,
      sourceMapping: this.toStringValue(node['sourceMapping']),
      destinationMapping: this.toStringValue(node['destinationMapping']),
      validations: Array.isArray(node['validations']) ? node['validations'].map((validation, index) => this.normalizeValidation(validation, `${path}.validations[${index}]`, errors)) : [],
      businessRules: Array.isArray(node['businessRules']) ? node['businessRules'].map((rule, index) => this.normalizeBusinessRule(rule, `${path}.businessRules[${index}]`, errors)) : [],
      transformations: Array.isArray(node['transformations']) ? node['transformations'].map((transformation, index) => this.normalizeTransformation(transformation, `${path}.transformations[${index}]`, errors)) : [],
      children
    };

    if (this.isPlainObject(node['fieldProfile'])) {
      normalizedNode.fieldProfile = this.normalizeFieldProfile(node['fieldProfile'], normalizedNode);
    }

    this.ensureFieldProfile(normalizedNode);
    return normalizedNode;
  }

  private normalizeFieldProfiles(value: unknown[]): { isValid: boolean; errors: string[]; datasources?: Datasource[] } {
    const errors: string[] = [];
    const nodes = value.map((profileValue, index) => {
      const fallbackName = `Imported Field ${index + 1}`;
      const profile = this.normalizeFieldProfile(profileValue, {
        id: `imported-field-${index + 1}`,
        name: fallbackName,
        code: `IMPORTED_FIELD_${index + 1}`,
        nodeType: 'FIELD',
        dataType: 'STRING',
        sourceMapping: '',
        destinationMapping: '',
        validations: [],
        businessRules: [],
        transformations: [],
        children: []
      });

      return {
        id: `imported-field-${index + 1}`,
        name: profile.DisplayName || profile.FieldName || fallbackName,
        code: profile.FieldName
          .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
          .replace(/[^A-Za-z0-9]+/g, '_')
          .replace(/^_+|_+$/g, '')
          .toUpperCase() || `IMPORTED_FIELD_${index + 1}`,
        nodeType: 'FIELD' as const,
        dataType: profile.DataType,
        sourceMapping: profile.SourceMapping.SourcePath,
        destinationMapping: profile.SourceMapping.TargetPath || profile.FieldPath,
        validations: [],
        businessRules: [],
        transformations: profile.Transformations.map((type, transformationIndex) => ({ id: `imported-transformation-${index + 1}-${transformationIndex + 1}`, type })),
        children: [],
        fieldProfile: profile
      };
    });

    return {
      isValid: errors.length === 0,
      errors,
      datasources: errors.length === 0
        ? [{
            id: 'imported-profile',
            name: 'Imported Profile',
            sourceType: 'JSON',
            status: 'ACTIVE',
            pkPattern: '',
            profileReviewStatus: 'PENDING',
            reviewComments: [],
            nodes
          }]
        : undefined
    };
  }

  private validateDatasources(datasources: Datasource[]): SchemaValidationResult {
    const errors: string[] = [];
    const datasourceNames = new Set<string>();
    const nodeIds = new Set<string>();

    datasources.forEach(datasource => {
      const datasourceName = datasource.name.trim();

      if (!datasourceName) {
        errors.push('Datasource name is required.');
      } else if (datasourceNames.has(datasourceName.toLowerCase())) {
        errors.push(`Duplicate datasource name "${datasource.name}".`);
      } else {
        datasourceNames.add(datasourceName.toLowerCase());
      }

      this.validateSiblingNodes(datasource.nodes, datasource.name, errors, nodeIds, new Set<string>());
    });

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  private validateSiblingNodes(
    nodes: SchemaNode[],
    path: string,
    errors: string[],
    nodeIds: Set<string>,
    ancestorIds: Set<string>
  ): void {
    const siblingNames = new Set<string>();

    nodes.forEach(node => {
      const nodePath = `${path} > ${node.name || '(unnamed)'}`;
      const trimmedName = node.name.trim();

      if (!trimmedName) {
        errors.push(`${nodePath}: node name is required.`);
      } else if (siblingNames.has(trimmedName.toLowerCase())) {
        errors.push(`${path}: duplicate child name "${node.name}".`);
      } else {
        siblingNames.add(trimmedName.toLowerCase());
      }

      if (nodeIds.has(node.id)) {
        errors.push(`${nodePath}: duplicate node id "${node.id}".`);
      } else {
        nodeIds.add(node.id);
      }

      if (ancestorIds.has(node.id)) {
        errors.push(`${nodePath}: circular node nesting is not allowed.`);
        return;
      }

      if (node.nodeType === 'FIELD' && node.children.length > 0) {
        errors.push(`${nodePath}: FIELD nodes cannot contain children.`);
      }

      if (node.nodeType === 'FIELD') {
        this.ensureFieldProfile(node);
        this.validateFieldProfile(node, nodePath, errors);
      }

      if (node.nodeType === 'OBJECT' && node.dataType !== 'OBJECT') {
        errors.push(`${nodePath}: OBJECT nodes must use OBJECT as the data type.`);
      }

      if (!this.canHaveChildren(node) && node.children.length > 0) {
        return;
      }

      const nextAncestors = new Set(ancestorIds);
      nextAncestors.add(node.id);
      this.validateSiblingNodes(node.children, nodePath, errors, nodeIds, nextAncestors);
    });
  }

  private createPersistableSnapshot(datasources: Datasource[]): Datasource[] {
    return datasources.map(datasource => ({
      ...datasource,
      nodes: datasource.nodes.map(node => this.cloneNodeWithoutParent(node))
    }));
  }

  private cloneNodeWithoutParent(node: SchemaNode): SchemaNode {
    this.ensureFieldProfile(node);
    const { parent: _parent, ...nodeData } = node;

    return {
      ...nodeData,
      fieldProfile: node.fieldProfile ? this.cloneFieldProfile(node.fieldProfile) : undefined,
      children: node.children.map(child => this.cloneNodeWithoutParent(child))
    };
  }

  private validateFieldProfile(node: SchemaNode, nodePath: string, errors: string[]): void {
    const profile = node.fieldProfile;
    const isScalarField = profile?.DataType !== 'OBJECT' && profile?.DataType !== 'ARRAY';

    if (!profile) {
      errors.push(`${nodePath}: field profile is required.`);
      return;
    }

    if (!profile.FieldPath.trim()) {
      errors.push(`${nodePath}: FieldPath is required.`);
    }

    if (!profile.FieldName.trim()) {
      errors.push(`${nodePath}: FieldName is required.`);
    }

    if (!profile.DisplayName.trim()) {
      errors.push(`${nodePath}: DisplayName is required.`);
    }

    if (profile.ValueMode !== 'DEFAULT' && profile.ValueMode !== 'ENUM') {
      errors.push(`${nodePath}: ValueMode must be DEFAULT or ENUM.`);
    }

    if (isScalarField && profile.ValueMode === 'ENUM' && profile.PossibleValues.length === 0) {
      errors.push(`${nodePath}: PossibleValues must have at least one value when ValueMode is ENUM.`);
    }

    profile.Validation.Rules.forEach((rule, index) => {
      if (!rule.Rule.trim()) {
        errors.push(`${nodePath}: validation rule ${index + 1} needs a Rule.`);
      }

      if (!['Error', 'Warning', 'Info'].includes(rule.Severity)) {
        errors.push(`${nodePath}: validation rule ${index + 1} needs a valid Severity.`);
      }

      if (!rule.Message.trim()) {
        errors.push(`${nodePath}: validation rule ${index + 1} needs a Message.`);
      }

      if (['MAX_LENGTH', 'MIN_LENGTH'].includes(rule.Rule) && (rule.Value === null || rule.Value === undefined || rule.Value === '')) {
        errors.push(`${nodePath}: ${rule.Rule} validation rule needs a value.`);
      }

      if (rule.Rule === 'REGEX' && !rule.Pattern?.trim()) {
        errors.push(`${nodePath}: REGEX validation rule needs a Pattern.`);
      }
    });

    profile.CrossFieldValidations.forEach((crossFieldValidation, index) => {
      if (!crossFieldValidation.FieldPath.trim()) {
        errors.push(`${nodePath}: cross field validation ${index + 1} needs a FieldPath.`);
      }

      if (!crossFieldValidation.Rule.trim()) {
        errors.push(`${nodePath}: cross field validation ${index + 1} needs a Rule.`);
      }

      if (!['Error', 'Warning', 'Info'].includes(crossFieldValidation.Severity)) {
        errors.push(`${nodePath}: cross field validation ${index + 1} needs a valid Severity.`);
      }
    });
  }

  private generateFieldProfileJson(datasources: Datasource[]): FieldProfile[] {
    const profiles: FieldProfile[] = [];

    datasources.forEach(datasource => {
      datasource.nodes.forEach(node => this.collectFieldProfiles(node, profiles));
    });

    return profiles;
  }

  private collectFieldProfiles(node: SchemaNode, profiles: FieldProfile[]): void {
    if (node.nodeType === 'FIELD') {
      this.ensureFieldProfile(node);
      if (node.fieldProfile) {
        profiles.push(this.cloneFieldProfile(node.fieldProfile));
      }
      return;
    }

    node.children.forEach(child => this.collectFieldProfiles(child, profiles));
  }

  private createDefaultFieldProfile(node: SchemaNode): FieldProfile {
    const fieldName = this.toFieldName(node.name);
    const fieldPath = this.toFieldPath(node);

    return {
      PK: `SCHEMA#${node.id}`,
      SK: `FIELD#${fieldPath}`,
      FieldPath: fieldPath,
      Section: fieldPath.includes('.') ? fieldPath.split('.')[0] : '',
      FieldName: fieldName,
      DisplayName: node.name,
      DataType: node.dataType,
      IsPII: false,
      SimilarFields: [],
      Description: '',
      Validation: {
        Type: 'STRUCTURAL',
        Rules: this.createDefaultValidationRules(node)
      },
      BusinessValidations: [],
      CrossFieldValidations: [],
      SourceMapping: {
        SourceType: 'JSON',
        SourcePath: node.sourceMapping,
        TargetPath: node.destinationMapping || fieldPath
      },
      ValueMode: 'DEFAULT',
      DefaultValue: null,
      PossibleValues: [],
      Transformations: node.transformations.map(transformation => transformation.type)
    };
  }

  private createDefaultValidationRules(node: SchemaNode): FieldValidationRule[] {
    return node.validations.map(validation => {
      if (validation.type === 'MANDATORY') {
        return { Rule: 'NOT_EMPTY', Severity: 'Error', Message: `${node.name} is required` };
      }

      if (validation.type === 'MAX_LENGTH') {
        return { Rule: 'MAX_LENGTH', Severity: 'Error', Value: validation.value ?? null, Message: `${node.name} too long` };
      }

      if (validation.type === 'PATTERN') {
        return { Rule: 'REGEX', Severity: 'Error', Pattern: validation.value || '', Message: `Invalid characters in ${node.name}` };
      }

      return {
        Rule: validation.type,
        Severity: 'Error',
        Value: validation.value ?? null,
        Message: `${node.name} failed ${validation.type}`
      };
    });
  }

  private cloneFieldProfile(profile: FieldProfile): FieldProfile {
    return {
      PK: profile.PK,
      SK: profile.SK,
      FieldPath: profile.FieldPath,
      Section: profile.Section,
      FieldName: profile.FieldName,
      DisplayName: profile.DisplayName,
      DataType: profile.DataType,
      IsPII: profile.IsPII,
      SimilarFields: [...profile.SimilarFields],
      Description: profile.Description,
      Validation: {
        ...profile.Validation,
        Rules: profile.Validation.Rules.map(rule => ({ ...rule }))
      },
      BusinessValidations: [...profile.BusinessValidations],
      CrossFieldValidations: profile.CrossFieldValidations.map(validation => ({ ...validation })),
      SourceMapping: { ...profile.SourceMapping },
      ValueMode: profile.ValueMode,
      DefaultValue: profile.DefaultValue,
      PossibleValues: [...profile.PossibleValues],
      Transformations: [...profile.Transformations]
    };
  }

  private normalizeSourceMapping(sourceMapping: Partial<FieldSourceMapping> | Record<string, unknown> | undefined, node: SchemaNode): FieldSourceMapping {
    const rawMapping = sourceMapping as Record<string, unknown> | undefined;
    const sourceType = this.normalizeSourceType(rawMapping?.['SourceType']);
    const sourcePath = this.toStringValue(rawMapping?.['SourcePath'])
      || this.toStringValue(rawMapping?.['PDF_AI_EXTRACT'])
      || this.toStringValue(rawMapping?.[sourceType])
      || node.sourceMapping;
    const targetPath = this.toStringValue(rawMapping?.['TargetPath'])
      || this.toStringValue(rawMapping?.['MSSQL'])
      || node.destinationMapping
      || this.toFieldPath(node);

    return {
      SourceType: sourceType,
      SourcePath: sourcePath,
      TargetPath: targetPath
    };
  }

  private normalizeSourceType(value: unknown): SourceMappingType {
    const normalizedValue = String(value || '').toUpperCase();
    return normalizedValue === 'XML' || normalizedValue === 'CSV' ? normalizedValue : 'JSON';
  }

  private normalizeDatasourceStatus(value: unknown): DatasourceStatus {
    const normalizedValue = String(value || '').toUpperCase();
    return normalizedValue === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE';
  }

  private normalizeProfileReviewStatus(value: unknown): ProfileReviewStatus {
    const normalizedValue = String(value || '').toUpperCase();
    return normalizedValue === 'APPROVED' || normalizedValue === 'REJECTED' || normalizedValue === 'CHANGES_REQUESTED'
      ? normalizedValue as ProfileReviewStatus
      : 'PENDING';
  }

  private normalizeReviewComments(value: unknown): ReviewComment[] {
    if (!Array.isArray(value)) {
      return [];
    }

    return value
      .map(item => this.normalizeReviewComment(item))
      .filter((item): item is ReviewComment => item !== null);
  }

  private normalizeReviewComment(value: unknown): ReviewComment | null {
    const comment = this.toRecord(value);
    const action = String(comment['action'] || '').toUpperCase();

    if (action !== 'APPROVE' && action !== 'REJECT' && action !== 'REQUEST_CHANGES') {
      return null;
    }

    return {
      id: this.toStringValue(comment['id']) || `review-${Date.now()}`,
      action: action as ProfileReviewAction,
      comment: this.toStringValue(comment['comment']),
      createdAt: this.toStringValue(comment['createdAt']) || new Date().toISOString()
    };
  }

  private mapReviewActionToStatus(action: ProfileReviewAction): ProfileReviewStatus {
    switch (action) {
      case 'APPROVE':
        return 'APPROVED';
      case 'REJECT':
        return 'REJECTED';
      case 'REQUEST_CHANGES':
        return 'CHANGES_REQUESTED';
    }
  }

  private toStringValue(value: unknown): string {
    return typeof value === 'string' ? value : '';
  }

  private isPlainObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }

  private toRecord(value: unknown): Record<string, unknown> {
    return this.isPlainObject(value) ? value : {};
  }

  private looksLikeFieldProfile(value: unknown): boolean {
    const profile = this.toRecord(value);
    return 'FieldName' in profile || 'DisplayName' in profile || 'SourceMapping' in profile || 'Validation' in profile;
  }

  private normalizeNodeType(value: unknown, path: string, errors: string[]): SchemaNode['nodeType'] {
    if (value === 'FIELD' || value === 'OBJECT' || value === 'ARRAY') {
      return value;
    }

    errors.push(`${path}.nodeType must be FIELD, OBJECT, or ARRAY.`);
    return 'FIELD';
  }

  private normalizeDataType(value: unknown, nodeType: SchemaNode['nodeType'], path: string, errors: string[]): SchemaNode['dataType'] {
    if (value === 'STRING' || value === 'NUMBER' || value === 'BOOLEAN' || value === 'DATE' || value === 'OBJECT' || value === 'ARRAY') {
      return value;
    }

    if (value !== undefined) {
      errors.push(`${path}.dataType is invalid.`);
    }

    if (nodeType === 'OBJECT') {
      return 'OBJECT';
    }

    if (nodeType === 'ARRAY') {
      return 'ARRAY';
    }

    return 'STRING';
  }

  private normalizeValidation(value: unknown, path: string, errors: string[]): Validation {
    const validation = this.toRecord(value);
    const type = this.toStringValue(validation['type']);

    if (!type) {
      errors.push(`${path}.type is required.`);
    }

    return {
      id: this.toStringValue(validation['id']) || `${path}-id`,
      type,
      value: this.toStringValue(validation['value'])
    };
  }

  private normalizeBusinessRule(value: unknown, path: string, errors: string[]): BusinessRule {
    const rule = this.toRecord(value);
    const code = this.toStringValue(rule['code']);

    if (!code) {
      errors.push(`${path}.code is required.`);
    }

    return {
      id: this.toStringValue(rule['id']) || `${path}-id`,
      code,
      description: this.toStringValue(rule['description'])
    };
  }

  private normalizeTransformation(value: unknown, path: string, errors: string[]): Transformation {
    const transformation = this.toRecord(value);
    const type = this.toStringValue(transformation['type']);

    if (!type) {
      errors.push(`${path}.type is required.`);
    }

    return {
      id: this.toStringValue(transformation['id']) || `${path}-id`,
      type,
      value: this.toStringValue(transformation['value'])
    };
  }

  private normalizeFieldProfile(value: unknown, node: SchemaNode): FieldProfile {
    const profile = this.toRecord(value);
    const validation = this.toRecord(profile['Validation']);
    const rules = Array.isArray(validation['Rules']) ? validation['Rules'].map(rule => this.normalizeFieldValidationRule(rule)) : [];

    return {
      PK: this.toStringValue(profile['PK']),
      SK: this.toStringValue(profile['SK']),
      FieldPath: this.toStringValue(profile['FieldPath']) || this.toFieldPath(node),
      Section: this.toStringValue(profile['Section']),
      FieldName: this.toStringValue(profile['FieldName']) || this.toFieldName(node.name),
      DisplayName: this.toStringValue(profile['DisplayName']) || node.name,
      DataType: this.normalizeDataType(profile['DataType'], 'FIELD', 'fieldProfile', []),
      IsPII: Boolean(profile['IsPII']),
      SimilarFields: Array.isArray(profile['SimilarFields']) ? profile['SimilarFields'].map(value => this.toStringValue(value)).filter(Boolean) : [],
      Description: this.toStringValue(profile['Description']),
      Validation: {
        Type: this.toStringValue(validation['Type']) || 'STRUCTURAL',
        Rules: rules
      },
      BusinessValidations: Array.isArray(profile['BusinessValidations'])
        ? profile['BusinessValidations'].map(value => this.toStringValue(value)).filter(Boolean)
        : [],
      CrossFieldValidations: Array.isArray(profile['CrossFieldValidations'])
        ? profile['CrossFieldValidations'].map(validationValue => {
          const crossFieldValidation = this.toRecord(validationValue);
          return {
            FieldPath: this.toStringValue(crossFieldValidation['FieldPath']),
            Rule: this.toStringValue(crossFieldValidation['Rule']),
            Severity: this.normalizeSeverity(crossFieldValidation['Severity'])
          };
        })
        : [],
      SourceMapping: this.normalizeSourceMapping(this.toRecord(profile['SourceMapping']), node),
      ValueMode: this.normalizeValueMode(profile['ValueMode']),
      DefaultValue: this.toStringValue(profile['DefaultValue']) || null,
      PossibleValues: Array.isArray(profile['PossibleValues'])
        ? profile['PossibleValues'].map(value => this.toStringValue(value)).filter(Boolean)
        : [],
      Transformations: Array.isArray(profile['Transformations'])
        ? profile['Transformations'].map(transformation => this.toStringValue(transformation)).filter(Boolean)
        : []
    };
  }

  private normalizeFieldValidationRule(value: unknown): FieldValidationRule {
    const rule = this.toRecord(value);
    const normalizedRule: FieldValidationRule = {
      Rule: this.toStringValue(rule['Rule']) || 'NOT_EMPTY',
      Severity: this.normalizeSeverity(rule['Severity']),
      Message: this.toStringValue(rule['Message'])
    };

    if ('Value' in rule) {
      const rawValue = rule['Value'];
      normalizedRule.Value = typeof rawValue === 'number' ? rawValue : this.toStringValue(rawValue);
    }

    if ('Pattern' in rule) {
      normalizedRule.Pattern = this.toStringValue(rule['Pattern']);
    }

    return normalizedRule;
  }

  private normalizeSeverity(value: unknown): ValidationSeverity {
    if (value === 'Warning' || value === 'Info') {
      return value;
    }

    return 'Error';
  }

  private normalizeValueMode(value: unknown): FieldValueMode {
    return value === 'ENUM' ? 'ENUM' : 'DEFAULT';
  }

  private toNumberOrNull(value: unknown): number | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }

    if (typeof value === 'number') {
      return Number.isFinite(value) ? value : null;
    }

    const parsedValue = Number(value);
    return Number.isFinite(parsedValue) ? parsedValue : null;
  }

  private toFieldPath(node: SchemaNode): string {
    if (node.destinationMapping.trim()) {
      return node.destinationMapping.trim();
    }

    if (node.sourceMapping.trim()) {
      return node.sourceMapping.trim().replace(/^\$\./, '');
    }

    return this.toFieldName(node.name);
  }

  private toFieldName(value: string): string {
    const words = value.trim().split(/[^A-Za-z0-9]+/).filter(Boolean);
    return words.map(word => word.charAt(0).toUpperCase() + word.slice(1)).join('') || 'NewField';
  }

  private toCsvName(value: string): string {
    return value
      .trim()
      .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
      .replace(/[^A-Za-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .toLowerCase();
  }

  private findNodeById(nodeId: string, datasources: Datasource[]): SchemaNode | null {
    for (const datasource of datasources) {
      for (const node of datasource.nodes) {
        const match = this.findNodeInTree(node, nodeId);
        if (match) {
          return match;
        }
      }
    }

    return null;
  }

  private findNodeInTree(node: SchemaNode, nodeId: string): SchemaNode | null {
    if (node.id === nodeId) {
      return node;
    }

    for (const child of node.children) {
      const match = this.findNodeInTree(child, nodeId);
      if (match) {
        return match;
      }
    }

    return null;
  }

  private removeNodeFromChildren(node: SchemaNode, nodeId: string): void {
    node.children = node.children.filter(child => child.id !== nodeId);
    node.children.forEach(child => this.removeNodeFromChildren(child, nodeId));
  }

  private containsNode(node: SchemaNode, nodeId: string): boolean {
    return node.id === nodeId || node.children.some(child => this.containsNode(child, nodeId));
  }
}

<!-- Copilot Instructions for MongoDB Schema Configuration Project -->

# MongoDB Schema Configuration UI - Project Setup Guide

## Project Overview
This Angular-based application provides a MongoDB schema configuration interface with a hierarchical tree structure on the left and a detailed node configuration panel on the right.

## Completed Setup Steps

### ✓ Project Structure Created
- Angular 17 project with standalone components
- TypeScript configuration
- SCSS styling
- Service-based state management

### ✓ Dependencies Installed
All npm packages installed successfully, including:
- @angular/core, @angular/common, @angular/forms
- @angular/platform-browser, @angular/router
- TypeScript, RxJS, and Angular CLI tools

### ✓ Development Server Running
- Angular dev server running on: **http://localhost:4200**
- Hot reload enabled for live development
- Application compiled successfully with no errors

## Project Structure

```
d:\workspace\crif-poc/
├── src/
│   ├── app/
│   │   ├── components/
│   │   │   ├── tree-view/
│   │   │   │   ├── tree-view.component.ts
│   │   │   │   ├── tree-view.component.html
│   │   │   │   └── tree-view.component.scss
│   │   │   └── node-config/
│   │   │       ├── node-config.component.ts
│   │   │       ├── node-config.component.html
│   │   │       └── node-config.component.scss
│   │   ├── models/
│   │   │   └── schema-node.model.ts
│   │   ├── services/
│   │   │   └── schema.service.ts
│   │   ├── app.component.ts
│   │   ├── app.component.html
│   │   └── app.component.scss
│   ├── styles.scss
│   ├── main.ts
│   └── index.html
├── .vscode/
│   ├── settings.json
│   └── tasks.json
├── angular.json
├── tsconfig.json
├── package.json
├── README.md
└── .gitignore
```

## Key Features Implemented

### 1. **Left Pane - Tree Structure**
- Hierarchical display of MongoDB schema datasources
- Expandable/collapsible nodes with visual indicators (▶/▼)
- Node type icons (📄 Field, 📚 Array, 📦 Object)
- Quick add buttons for Field, Object, and Array at root level
- Inline add buttons for child nodes

### 2. **Right Pane - Node Configuration Panel**
- **Basic Information**: Name, Code, Node Type, Data Type
- **Mappings**: Source and Destination mapping paths
- **Validations**: MANDATORY, UNIQUE, EMAIL, PATTERN, MIN_LENGTH, MAX_LENGTH
- **Business Rules**: BR001-BR004 codes
- **Transformations**: ALL_CAPS, LOWERCASE, TRIM, REPLACE, CONCATENATE
- **Children Management**: Add child nodes to hierarchy

### 3. **Interactive Features**
- Click on tree nodes to select and configure
- Real-time updates in configuration panel
- Add/remove validations, business rules, transformations
- Create nested structures with parent-child relationships
- Visual feedback with highlighting selected nodes

## Development Commands

### Start Development Server
```bash
npm start
# or
node .\node_modules\@angular\cli\bin\ng.js serve
```
Server runs on: `http://localhost:4200`

### Build for Production
```bash
npm run build
```

### Watch Mode (for development)
```bash
npm run watch
```

### Run Tests
```bash
npm run test
```

## Architecture

### Services
- **SchemaService**: Manages application state using RxJS BehaviorSubjects
  - `selectedNode$`: Observable for selected node
  - `datasources$`: Observable for datasources
  - Methods for CRUD operations on nodes

### Components
- **AppComponent**: Root layout container
- **TreeViewComponent**: Standalone component for tree display
- **NodeConfigComponent**: Standalone component for configuration panel

### Models
- **SchemaNode**: Main entity with recursive children
- **Validation**: Validation rule interface
- **BusinessRule**: Business rule interface
- **Transformation**: Data transformation interface
- **Datasource**: Container for root nodes

## Sample Data
The application initializes with sample MongoDB schema data:
```
Datasource-1
├── Company Name (FIELD, STRING)
├── Company Address (ARRAY, OBJECT)
│   ├── Line1 (FIELD, STRING)
│   ├── City (FIELD, STRING)
│   └── Pin (FIELD, STRING)
└── Employee (ARRAY, OBJECT)
```

## Styling
- **Color Scheme**: Blue header (#1976d2), light backgrounds
- **Responsive Design**: Desktop-first, mobile-friendly
- **Component Spacing**: SCSS utilities for consistent margins/padding
- **Interactive Elements**: Hover effects, transitions, focus states

## Browser Support
- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Next Steps for Enhancement

### Phase 1 - Data Persistence
- [ ] Create backend API endpoints for CRUD operations
- [ ] Implement HTTP service for API communication
- [ ] Add authentication/authorization

### Phase 2 - Advanced Features
- [ ] Export schema to JSON/MongoDB format
- [ ] Import from MongoDB databases
- [ ] Schema validation before export
- [ ] Version control and history

### Phase 3 - UI/UX Improvements
- [ ] Drag-and-drop tree node reordering
- [ ] Search and filter functionality
- [ ] Keyboard shortcuts for common operations
- [ ] Dark mode support
- [ ] Undo/Redo functionality

### Phase 4 - Collaboration
- [ ] Real-time collaborative editing
- [ ] User comments and discussions
- [ ] Change tracking and approvals

## Troubleshooting

### Dev Server Not Starting
- Ensure Node.js is installed: `node --version`
- Clear node_modules and reinstall: `npm install`
- Check port 4200 is not in use: `netstat -ano | findstr :4200`

### Compilation Errors
- Clear Angular cache: `npm install --legacy-peer-deps`
- Check TypeScript version: `npx tsc --version`
- Review .scss syntax in component styles

### Hot Reload Not Working
- Check if browser has caching disabled in DevTools
- Verify file changes are saved
- Restart dev server

## Additional Resources

- [Angular Documentation](https://angular.io/docs)
- [Angular CLI](https://angular.io/cli)
- [TypeScript Handbook](https://www.typescriptlang.org/docs)
- [RxJS Documentation](https://rxjs.dev)
- [MongoDB Schema Design](https://docs.mongodb.com/manual/core/schema-validation)

## License
This project is open source and available under the MIT License.

---

**Project Status**: ✓ Development Ready
**Last Updated**: May 6, 2026
**Development Server**: Running on http://localhost:4200

# MongoDB Schema Configuration UI

An Angular-based web application for configuring MongoDB schema mappings with a hierarchical tree structure on the left and a detailed node configuration panel on the right.

## Features

- **Tree Structure View**: Hierarchical representation of MongoDB schema with datasources and nested fields
- **Node Configuration Panel**: Configure fields with properties like:
  - Name and Code
  - Node Type (Field, Object, Array)
  - Data Type (String, Number, Boolean, Date, Object, Array)
  - Source and Destination Mappings
  - Validations
  - Business Rules
  - Transformations
  - Child Management

- **Interactive UI**:
  - Add/Remove fields, objects, and arrays
  - Drag-and-drop tree navigation
  - Real-time configuration updates
  - Responsive layout (desktop and tablet friendly)

## Project Structure

```
src/
├── app/
│   ├── components/
│   │   ├── tree-view/          # Left pane tree component
│   │   └── node-config/        # Right pane configuration panel
│   ├── models/
│   │   └── schema-node.model.ts # Data models and interfaces
│   ├── services/
│   │   └── schema.service.ts    # Schema state management
│   ├── app.component.ts         # Root component
│   ├── app.component.html
│   └── app.component.scss
├── styles.scss                  # Global styles
├── main.ts                      # Application entry point
└── index.html
```

## Installation

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm start
```

3. Open your browser and navigate to:
```
http://localhost:4200
```

## Development

- **Build**: `npm run build`
- **Watch mode**: `npm run watch`
- **Run tests**: `npm run test`

## Technologies Used

- Angular 17
- TypeScript
- SCSS
- RxJS

## Architecture

### Services
- **SchemaService**: Manages schema state, node selection, and CRUD operations

### Components
- **AppComponent**: Main layout container
- **TreeViewComponent**: Hierarchical tree display with add/expand controls
- **NodeConfigComponent**: Configuration panel for selected nodes

### Models
- **SchemaNode**: Main schema entity with nested children
- **Validation**: Validation rules for nodes
- **BusinessRule**: Business logic references
- **Transformation**: Data transformation rules
- **Datasource**: Container for root nodes

## Usage

1. **Select a Node**: Click on any node in the left tree pane to select it
2. **Configure Node**: Edit properties in the right configuration panel
3. **Add Children**: Use the "Add Child" button or quick add buttons in the tree
4. **Manage Properties**:
   - Add/Remove Validations
   - Add/Remove Business Rules
   - Add/Remove Transformations
5. **Save Changes**: Changes are auto-saved to the component state

## Future Enhancements

- [ ] Persist schema to backend API
- [ ] Export schema to JSON/MongoDB format
- [ ] Import schema from existing databases
- [ ] Advanced validation rules editor
- [ ] Schema versioning and history
- [ ] Collaborative editing
- [ ] Search and filter functionality

## License

This project is open source and available under the MIT License.

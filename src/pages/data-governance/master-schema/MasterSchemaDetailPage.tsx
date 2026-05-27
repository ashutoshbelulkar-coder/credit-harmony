/**
 * MasterSchemaDetailPage — read-only view of a master schema. Delegates to
 * the unified MasterModelEditorPage in `view` mode so existing routes
 * (/data-governance/master-schema/:id) render the new tree-based POC UI.
 */
import { MasterModelEditorPage } from "./MasterModelEditorPage";

export function MasterSchemaDetailPage() {
  return <MasterModelEditorPage mode="view" />;
}

export default MasterSchemaDetailPage;

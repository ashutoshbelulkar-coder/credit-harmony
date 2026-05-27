/**
 * MasterSchemaEditorPage — thin wrapper that delegates to the unified
 * MasterModelEditorPage so that /new and /:id/edit both render the new
 * tree-based POC flow.
 */
import { MasterModelEditorPage } from "./MasterModelEditorPage";

interface MasterSchemaEditorPageProps {
  mode: "create" | "edit";
}

export function MasterSchemaEditorPage({ mode }: MasterSchemaEditorPageProps) {
  return <MasterModelEditorPage mode={mode} />;
}

export default MasterSchemaEditorPage;

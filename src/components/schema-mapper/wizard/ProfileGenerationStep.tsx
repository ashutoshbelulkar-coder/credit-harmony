import { useCallback, useEffect, useRef, useState } from "react";
import { Upload, FileJson, BookOpen, Loader2, X, FileText, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type {
  BusinessValidationType,
  CrossFieldValidation,
  Datasource,
  FieldValidationRule,
  MappingConfidence,
  SchemaNode,
  TransformationType,
} from "@/types/datasource-onboarding";
import masterRecordModel from "@/data/master-record-model.json";

const MAX_SAMPLE_FILES = 50;
const SAMPLE_FILE_ACCEPT = ".json,.xml,.csv,.txt";

export interface ProfileGenerationFiles {
  sampleFiles: File[];
  jsonSchemaFile: File | null;
  guideDocFile: File | null;
}

export interface ProfileGenerationStepProps {
  datasourceName: string;
  initialFiles: ProfileGenerationFiles;
  initialNodes: SchemaNode[];
  onComplete: (payload: { files: ProfileGenerationFiles; nodes: SchemaNode[] }) => void;
}

/** Static dummy tree built from `master-record-model.json` for the AI simulation. */
function buildDummyNodes(): SchemaNode[] {
  type SeedNode = {
    key: string;
    fullPath: string;
    isLeaf: boolean;
    isArray: boolean;
    nodeType: SchemaNode["nodeType"];
    dataType: SchemaNode["dataType"];
    children?: SeedNode[];
    profile?: Record<string, unknown>;
  };
  const seedTree = (masterRecordModel as { tree: SeedNode[] }).tree;
  const visit = (node: SeedNode, parentPath: string): SchemaNode => {
    const id = `gen-${node.fullPath.replace(/[^a-zA-Z0-9]/g, "-")}`;
    const code = node.fullPath.toUpperCase().replace(/[^A-Z0-9]/g, "_");
    const children = (node.children ?? []).map((c) => visit(c, node.fullPath));
    const fieldProfile =
      node.isLeaf && node.profile
        ? {
            PK: String(node.profile.pk ?? ""),
            SK: String(node.profile.sk ?? ""),
            FieldPath: node.fullPath,
            Section: node.fullPath.split(".")[0] ?? "",
            FieldName: node.key,
            DisplayName: String(node.profile.displayName ?? node.key),
            DataType: node.dataType,
            IsPII: Boolean(node.profile.isPii),
            SimilarFields: Array.isArray(node.profile.similarFields) ? (node.profile.similarFields as string[]) : [],
            Description: String(node.profile.description ?? ""),
            Validation: {
              Type: node.dataType,
              Rules: Array.isArray(node.profile.validationRules)
                ? (node.profile.validationRules as FieldValidationRule[])
                : [],
            },
            BusinessValidations: Array.isArray(node.profile.businessValidations)
              ? (node.profile.businessValidations as BusinessValidationType[])
              : [],
            CrossFieldValidations: Array.isArray(node.profile.crossFieldValidations)
              ? (node.profile.crossFieldValidations as CrossFieldValidation[])
              : [],
            SourceMapping: {
              SourceType: "JSON" as const,
              SourcePath: String(node.profile.sourcePath ?? node.fullPath),
              TargetPath: String(node.profile.targetPath ?? node.fullPath),
            },
            ValueMode: node.profile.valueMode === "ENUM" ? ("ENUM" as const) : ("DEFAULT" as const),
            DefaultValue: (node.profile.defaultValue as string | null | undefined) ?? null,
            PossibleValues: Array.isArray(node.profile.possibleValues) ? (node.profile.possibleValues as string[]) : [],
            Transformations: Array.isArray(node.profile.transformations)
              ? (node.profile.transformations as TransformationType[])
              : [],
          }
        : undefined;

    let sum = 0;
    for (const ch of node.fullPath) sum += ch.charCodeAt(0);
    const conf: MappingConfidence[] = ["HIGH", "MEDIUM", "LOW"];
    let mappingConfidence: MappingConfidence | undefined;
    let profile = fieldProfile;
    if (node.isLeaf && profile) {
      mappingConfidence = conf[sum % 3];
      if (sum % 7 === 0) {
        profile = {
          ...profile,
          SourceMapping: { ...profile.SourceMapping, SourcePath: "" },
        };
      }
    }

    return {
      id,
      name: node.key,
      code,
      nodeType: node.nodeType,
      dataType: node.dataType,
      sourceMapping: parentPath ? `${parentPath}.${node.key}` : node.fullPath,
      destinationMapping: node.fullPath,
      validations: [],
      businessRules: [],
      transformations: [],
      children,
      fieldProfile: profile,
      ...(mappingConfidence ? { mappingConfidence } : {}),
    };
  };
  return seedTree.map((root) => visit(root, ""));
}

export function ProfileGenerationStep({ datasourceName, initialFiles, initialNodes, onComplete }: ProfileGenerationStepProps) {
  const [files, setFiles] = useState<ProfileGenerationFiles>(initialFiles);
  const [nodes, setNodes] = useState<SchemaNode[]>(initialNodes);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedAt, setGeneratedAt] = useState<string | null>(initialNodes.length ? new Date().toISOString() : null);
  const sampleInputRef = useRef<HTMLInputElement | null>(null);
  const schemaInputRef = useRef<HTMLInputElement | null>(null);
  const guideInputRef = useRef<HTMLInputElement | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  }, []);

  const handleAddSamples = useCallback((incoming: FileList | null) => {
    if (!incoming) return;
    const list = Array.from(incoming);
    setFiles((prev) => {
      const merged = [...prev.sampleFiles, ...list];
      if (merged.length > MAX_SAMPLE_FILES) {
        toast.error(`Maximum ${MAX_SAMPLE_FILES} sample files allowed`);
        return { ...prev, sampleFiles: merged.slice(0, MAX_SAMPLE_FILES) };
      }
      return { ...prev, sampleFiles: merged };
    });
  }, []);

  const removeSample = useCallback((idx: number) => {
    setFiles((prev) => ({ ...prev, sampleFiles: prev.sampleFiles.filter((_, i) => i !== idx) }));
  }, []);

  const handleGenerate = useCallback(() => {
    setIsGenerating(true);
    const filesSnapshot = files;
    timeoutRef.current = setTimeout(() => {
      const generated = buildDummyNodes();
      setNodes(generated);
      setGeneratedAt(new Date().toISOString());
      setIsGenerating(false);
      toast.success("Profile generated (simulated)");
      onComplete({ files: filesSnapshot, nodes: generated });
    }, 5000);
  }, [files, onComplete]);

  const canGenerate = files.sampleFiles.length > 0 && !isGenerating;

  return (
    <div className="relative space-y-4">
      {isGenerating && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
          aria-live="polite"
          aria-busy="true"
        >
          <div className="flex max-w-sm flex-col items-center gap-4 rounded-xl border border-border bg-card px-8 py-10 shadow-lg">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-center text-body font-medium text-foreground">Generating profile</p>
            <p className="text-center text-caption text-muted-foreground">
              Analysing payloads against the master record model…
            </p>
          </div>
        </div>
      )}

      <Card className="border-border shadow-sm">
        <CardContent className="p-4 space-y-4">
          <div>
            <h2 className="text-h4 font-semibold text-foreground">Profile generation</h2>
            <p className="mt-0.5 text-caption text-muted-foreground">
              Upload sample payloads for <span className="font-medium text-foreground">{datasourceName || "this datasource"}</span> and run AI profile generation.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {/* Sample files (multi, max 50) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-caption font-medium text-foreground">Sample files</p>
                <span className="text-caption text-muted-foreground tabular-nums">
                  {files.sampleFiles.length} / {MAX_SAMPLE_FILES}
                </span>
              </div>
              <button
                type="button"
                onClick={() => sampleInputRef.current?.click()}
                disabled={files.sampleFiles.length >= MAX_SAMPLE_FILES}
                className={cn(
                  "flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-muted/30 p-6 text-center transition-colors hover:bg-muted/50",
                  files.sampleFiles.length >= MAX_SAMPLE_FILES && "cursor-not-allowed opacity-50",
                )}
              >
                <Upload className="h-5 w-5 text-muted-foreground" />
                <span className="text-body font-medium text-foreground">Drop or click to add</span>
                <span className="text-caption text-muted-foreground">JSON, XML, CSV, TXT</span>
              </button>
              <input
                ref={sampleInputRef}
                type="file"
                accept={SAMPLE_FILE_ACCEPT}
                multiple
                className="hidden"
                onChange={(e) => handleAddSamples(e.target.files)}
              />
              {files.sampleFiles.length === MAX_SAMPLE_FILES && (
                <p className="text-caption text-destructive">Maximum {MAX_SAMPLE_FILES} sample files reached.</p>
              )}
            </div>

            {/* JSON Schema (single) */}
            <div className="space-y-2">
              <p className="text-caption font-medium text-foreground">JSON Schema (optional)</p>
              <button
                type="button"
                onClick={() => schemaInputRef.current?.click()}
                className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-muted/30 p-6 text-center transition-colors hover:bg-muted/50"
              >
                <FileJson className="h-5 w-5 text-muted-foreground" />
                <span className="text-body font-medium text-foreground">
                  {files.jsonSchemaFile?.name ?? "Upload schema"}
                </span>
                <span className="text-caption text-muted-foreground">.json</span>
              </button>
              <input
                ref={schemaInputRef}
                type="file"
                accept=".json"
                className="hidden"
                onChange={(e) => setFiles((p) => ({ ...p, jsonSchemaFile: e.target.files?.[0] ?? null }))}
              />
              {files.jsonSchemaFile && (
                <Button variant="ghost" size="sm" className="h-7 px-2 text-caption" onClick={() => setFiles((p) => ({ ...p, jsonSchemaFile: null }))}>
                  Remove
                </Button>
              )}
            </div>

            {/* Guide doc (single) */}
            <div className="space-y-2">
              <p className="text-caption font-medium text-foreground">Guide doc (optional)</p>
              <button
                type="button"
                onClick={() => guideInputRef.current?.click()}
                className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-muted/30 p-6 text-center transition-colors hover:bg-muted/50"
              >
                <BookOpen className="h-5 w-5 text-muted-foreground" />
                <span className="text-body font-medium text-foreground">
                  {files.guideDocFile?.name ?? "Upload doc"}
                </span>
                <span className="text-caption text-muted-foreground">.pdf .md .txt</span>
              </button>
              <input
                ref={guideInputRef}
                type="file"
                accept=".pdf,.md,.txt"
                className="hidden"
                onChange={(e) => setFiles((p) => ({ ...p, guideDocFile: e.target.files?.[0] ?? null }))}
              />
              {files.guideDocFile && (
                <Button variant="ghost" size="sm" className="h-7 px-2 text-caption" onClick={() => setFiles((p) => ({ ...p, guideDocFile: null }))}>
                  Remove
                </Button>
              )}
            </div>
          </div>

          {/* Sample list */}
          {files.sampleFiles.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-caption font-medium uppercase tracking-wider text-muted-foreground">
                Selected samples ({files.sampleFiles.length})
              </p>
              <div className="max-h-48 overflow-auto rounded-lg border border-border bg-card">
                <ul>
                  {files.sampleFiles.map((f, idx) => (
                    <li key={`${f.name}-${idx}`} className="flex items-center justify-between gap-2 border-b border-border px-3 py-2 last:border-b-0">
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        <span className="text-body font-medium text-foreground truncate">{f.name}</span>
                        <Badge variant="secondary" className="text-[9px] leading-[12px] font-normal">
                          {(f.size / 1024).toFixed(1)} KB
                        </Badge>
                      </div>
                      <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => removeSample(idx)} aria-label="Remove sample">
                        <X className="h-3 w-3" />
                      </Button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-caption text-muted-foreground">
              {generatedAt ? (
                <>Last generated: <span className="tabular-nums">{new Date(generatedAt).toLocaleString("en-IN")}</span></>
              ) : (
                "Generation runs as a static 5-second simulation against the master record model. You will move to review when it completes."
              )}
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                className="gap-1.5"
                onClick={handleGenerate}
                disabled={!canGenerate}
              >
                {isGenerating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                {isGenerating ? "Generating…" : nodes.length ? "Regenerate profile" : "Generate profile"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export { buildDummyNodes };
export type { Datasource };

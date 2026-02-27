import { useState, useRef, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Upload, FileText, X } from "lucide-react";
import { cn } from "@/lib/utils";

const ACCEPT = ".pdf,.csv,.xls,.xlsx";
const ACCEPT_TYPES = ["application/pdf", "text/csv", "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"];
const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isValidType(file: File): boolean {
  const ext = file.name.split(".").pop()?.toLowerCase();
  const validExts = ["pdf", "csv", "xls", "xlsx"];
  if (ext && validExts.includes(ext)) return true;
  return ACCEPT_TYPES.some((t) => file.type === t || file.type.startsWith("application/vnd."));
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (file: File) => void;
}

export function BankStatementUploadModal({ open, onClose, onSubmit }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const inputRef = useRef<HTMLInputElement>(null);

  const validateFile = useCallback((f: File): string | null => {
    if (f.size > MAX_SIZE_BYTES) return "File size must be under 10 MB";
    if (!isValidType(f)) return "Please upload a PDF, CSV, or Excel file";
    return null;
  }, []);

  const setFileWithValidation = useCallback(
    (f: File | null) => {
      setErrors({});
      if (!f) {
        setFile(null);
        return;
      }
      const err = validateFile(f);
      if (err) {
        setErrors({ file: err });
        setFile(null);
        return;
      }
      setFile(f);
    },
    [validateFile]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const chosen = e.target.files?.[0];
      if (chosen) setFileWithValidation(chosen);
      e.target.value = "";
    },
    [setFileWithValidation]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const dropped = e.dataTransfer.files?.[0];
      if (dropped) setFileWithValidation(dropped);
    },
    [setFileWithValidation]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const handleZoneClick = useCallback(() => {
    inputRef.current?.click();
  }, []);

  const handleRemove = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setFile(null);
    setErrors({});
  }, []);

  const validate = useCallback((): boolean => {
    if (!file) {
      setErrors({ file: "Please select a file to upload" });
      return false;
    }
    const err = validateFile(file);
    if (err) {
      setErrors({ file: err });
      return false;
    }
    setErrors({});
    return true;
  }, [file, validateFile]);

  const handleSubmit = useCallback(() => {
    if (!validate() || !file) return;
    onSubmit(file);
    setFile(null);
    setErrors({});
    onClose();
  }, [file, validate, onSubmit, onClose]);

  const handleClose = useCallback(() => {
    setFile(null);
    setDragOver(false);
    setErrors({});
    onClose();
  }, [onClose]);

  return (
    <Dialog open={open} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-h4 font-semibold text-foreground">Upload Bank Statement</DialogTitle>
          <p className="text-caption text-muted-foreground mt-1">Upload a bank statement for cash flow analysis.</p>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPT}
            onChange={handleInputChange}
            className="hidden"
            aria-hidden
          />
          <div
            role="button"
            tabIndex={0}
            onClick={handleZoneClick}
            onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && handleZoneClick()}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={cn(
              "rounded-lg border-2 border-dashed transition-colors min-h-[160px] flex flex-col items-center justify-center gap-2 p-6 cursor-pointer",
              "border-border bg-muted/30 hover:border-primary/30 hover:bg-muted/50",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              dragOver && "border-primary/50 bg-primary/5"
            )}
          >
            {file ? (
              <>
                <div className="flex items-center gap-3 w-full justify-center flex-wrap">
                  <FileText className="w-10 h-10 text-primary shrink-0" />
                  <div className="text-left min-w-0">
                    <p className="text-body font-medium text-foreground truncate max-w-[220px]">{file.name}</p>
                    <p className="text-caption text-muted-foreground">{formatSize(file.size)}</p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="shrink-0 h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                    onClick={handleRemove}
                    aria-label="Remove file"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-caption text-muted-foreground">Click or drop another file to replace</p>
              </>
            ) : (
              <>
                <Upload className="w-10 h-10 text-muted-foreground" />
                <p className="text-body font-medium text-foreground">Drag and drop or click to browse</p>
                <p className="text-caption text-muted-foreground text-center">PDF, CSV, or Excel · Max 10 MB</p>
              </>
            )}
          </div>
          {errors.file && <p className="text-[10px] text-destructive">{errors.file}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!file}>
            Upload
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

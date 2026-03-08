/**
 * Generic CSV export utility.
 * Converts an array of objects to CSV and triggers a browser download.
 */
export function exportToCsv<T>(
  filename: string,
  data: T[],
  columns: { key: keyof T; label: string }[]
) {
  if (data.length === 0) return;

  const header = columns.map((c) => `"${String(c.label)}"`).join(",");
  const rows = data.map((row) =>
    columns
      .map((c) => {
        const val = row[c.key];
        const str = val === null || val === undefined ? "" : String(val);
        return `"${str.replace(/"/g, '""')}"`;
      })
      .join(",")
  );

  const csv = [header, ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${filename}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

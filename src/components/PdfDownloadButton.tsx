import { useState } from "react";
import { pdf } from "@react-pdf/renderer";
import { FileDown, Loader2 } from "lucide-react";
import UnderwritingReportPDF, { type UnderwritingReportData } from "./UnderwritingReportPDF";

interface Props {
  data: UnderwritingReportData;
  fileName?: string;
  className?: string;
  label?: string;
}

/**
 * Generates the executive PDF on-demand and triggers download.
 * Uses pdf().toBlob() so we never render the heavy PDF tree until clicked.
 */
export default function PdfDownloadButton({ data, fileName, className, label }: Props) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const handleDownload = async () => {
    setBusy(true);
    setErr(null);
    try {
      const safe = (data.propertyName || "RentIntel-Deal").replace(/[^a-z0-9\-_]+/gi, "_");
      const name = fileName || `${safe}_Underwriting.pdf`;
      const blob = await pdf(<UnderwritingReportPDF data={data} />).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      console.error("PDF export failed", e);
      setErr("Couldn't generate the report. Please retry.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={className}>
      <button
        type="button"
        onClick={handleDownload}
        disabled={busy}
        className="btn-primary w-full disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
        {busy ? "Generating Executive Report…" : (label || "Generate Executive Report (PDF)")}
      </button>
      {err && <p className="text-xs text-destructive mt-2">{err}</p>}
    </div>
  );
}

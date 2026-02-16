"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/components/ui/use-toast";
import {
  Upload,
  ChevronDown,
  FileSpreadsheet,
  Code2,
  Globe,
  Loader2,
  Copy,
  Check,
} from "lucide-react";
import { bulkCreateEnquiries } from "@/lib/actions/enquiries";

// ===================== CSV IMPORT DIALOG =====================

function ImportCSVDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) setFile(dropped);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) setFile(selected);
  };

  const parseCSV = (text: string) => {
    const lines = text.split("\n").filter((l) => l.trim());
    if (lines.length < 2) throw new Error("CSV must have a header row and at least one data row");

    const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
    const requiredHeaders = ["firstname", "lastname", "email", "phone"];
    for (const req of requiredHeaders) {
      if (!headers.includes(req)) {
        throw new Error(`Missing required column: ${req}`);
      }
    }

    const rows = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(",").map((v) => v.trim());
      if (values.length < headers.length) continue;

      const row: Record<string, string> = {};
      headers.forEach((h, idx) => {
        row[h] = values[idx] || "";
      });

      if (!row.firstname || !row.lastname || !row.email || !row.phone) continue;

      rows.push({
        firstName: row.firstname,
        lastName: row.lastname,
        email: row.email,
        phone: row.phone,
        message: row.message || undefined,
        source: row.source || undefined,
        budget: row.budget || undefined,
        country: row.country || undefined,
      });
    }

    return rows;
  };

  const handleImport = async () => {
    if (!file) return;
    setIsImporting(true);

    try {
      const text = await file.text();
      const rows = parseCSV(text);

      if (!rows.length) {
        toast({
          variant: "destructive",
          title: "No valid rows",
          description: "The file contains no valid data rows.",
        });
        return;
      }

      const result = await bulkCreateEnquiries(rows);
      toast({
        title: "Import successful",
        description: `${result.count} enquiries have been imported.`,
      });
      setFile(null);
      onOpenChange(false);
      router.refresh();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Import failed",
        description: error instanceof Error ? error.message : "Failed to import",
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleDownloadTemplate = () => {
    const headers = "firstName,lastName,email,phone,message,source,budget,country";
    const example = "John,Doe,john@example.com,+1234567890,Interested in villas,WEBSITE_FORM,$500k - $1M,United Kingdom";
    const csv = `${headers}\n${example}`;
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "enquiries-import-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Import Leads from Excel/CSV</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Upload Area */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">
              Upload CSV File
            </p>
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 cursor-pointer transition-colors ${
                isDragging
                  ? "border-[#dc2626] bg-blue-50"
                  : file
                    ? "border-green-300 bg-green-50"
                    : "border-gray-300 hover:border-gray-400 bg-gray-50"
              }`}
            >
              <FileSpreadsheet className="h-10 w-10 text-gray-400 mb-3" />
              {file ? (
                <div className="text-center">
                  <p className="text-sm font-medium text-gray-900">{file.name}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {(file.size / 1024).toFixed(1)} KB
                  </p>
                </div>
              ) : (
                <>
                  <p className="text-sm">
                    <span className="font-medium text-[#dc2626]">Choose a file</span>
                    <span className="text-gray-500"> or drag and drop</span>
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    CSV, XLS, or XLSX (Max 10MB)
                  </p>
                </>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xls,.xlsx"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
          </div>

          {/* Instructions */}
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <p className="text-sm font-semibold text-gray-900 mb-2">
              Import Instructions:
            </p>
            <ul className="space-y-1.5 text-sm text-gray-600">
              <li className="flex gap-2">
                <span className="text-gray-400">&bull;</span>
                Download the template below and fill in your data
              </li>
              <li className="flex gap-2">
                <span className="text-gray-400">&bull;</span>
                Make sure all required fields are populated
              </li>
              <li className="flex gap-2">
                <span className="text-gray-400">&bull;</span>
                Use comma-separated format (CSV)
              </li>
              <li className="flex gap-2">
                <span className="text-gray-400">&bull;</span>
                For multiple values (tags, features), use semicolons (;)
              </li>
              <li className="flex gap-2">
                <span className="text-gray-400">&bull;</span>
                Date format: YYYY-MM-DD
              </li>
            </ul>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={handleDownloadTemplate}
            className="gap-2"
          >
            <Upload className="h-4 w-4" />
            Download Template
          </Button>
          <div className="flex gap-2 ml-auto">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleImport}
              disabled={!file || isImporting}
              className="bg-[#dc2626] hover:bg-[#b91c1c] text-white"
            >
              {isImporting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Import Leads
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ===================== WEBSITE FORM INTEGRATION DIALOG =====================

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="absolute top-3 right-3 flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
    >
      {copied ? (
        <Check className="h-3.5 w-3.5 text-green-500" />
      ) : (
        <Copy className="h-3.5 w-3.5" />
      )}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

const iframeCode = `<iframe
  src="https://your-crm.com/embed/lead-form"
  width="100%"
  height="600"
  frameborder="0"
></iframe>`;

const htmlFormCode = `<form action="https://your-crm.com/api/enquiries"
  method="POST">
  <input type="text" name="firstName"
    placeholder="First Name" required />
  <input type="text" name="lastName"
    placeholder="Last Name" required />
  <input type="email" name="email"
    placeholder="Email" required />
  <input type="tel" name="phone"
    placeholder="Phone" required />
  <textarea name="message"
    placeholder="Message"></textarea>
  <input type="hidden" name="source"
    value="WEBSITE_FORM" />
  <button type="submit">Submit</button>
</form>`;

const apiCode = `fetch("https://your-crm.com/api/enquiries", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": "Bearer YOUR_API_KEY"
  },
  body: JSON.stringify({
    firstName: "John",
    lastName: "Doe",
    email: "john@example.com",
    phone: "+1234567890",
    message: "Interested in properties",
    source: "WEBSITE_FORM"
  })
})`;

const wordpressCode = `// Add to your theme's functions.php
// or use the shortcode [pqt_lead_form]

function pqt_lead_form_shortcode() {
  return '<iframe
    src="https://your-crm.com/embed/lead-form"
    width="100%"
    height="600"
    frameborder="0"
    style="border:none;max-width:100%;"
  ></iframe>';
}
add_shortcode(
  'pqt_lead_form',
  'pqt_lead_form_shortcode'
);`;

function WebFormDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Website Form Integration</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="iframe" className="mt-2">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="iframe" className="gap-1.5 text-xs">
              <Globe className="h-3.5 w-3.5" />
              iFrame
            </TabsTrigger>
            <TabsTrigger value="html" className="gap-1.5 text-xs">
              <Code2 className="h-3.5 w-3.5" />
              HTML Form
            </TabsTrigger>
            <TabsTrigger value="api" className="gap-1.5 text-xs">
              <Code2 className="h-3.5 w-3.5" />
              API
            </TabsTrigger>
            <TabsTrigger value="wordpress" className="gap-1.5 text-xs">
              <Code2 className="h-3.5 w-3.5" />
              WordPress
            </TabsTrigger>
          </TabsList>

          <TabsContent value="iframe" className="space-y-4 mt-4">
            <p className="text-sm text-gray-600">
              Embed a pre-built lead capture form directly into your website:
            </p>
            <div className="relative rounded-lg border border-gray-200 bg-gray-900 p-4 pr-24">
              <pre className="text-sm text-gray-100 whitespace-pre-wrap font-mono leading-relaxed">
                {iframeCode}
              </pre>
              <CopyButton text={iframeCode} />
            </div>
          </TabsContent>

          <TabsContent value="html" className="space-y-4 mt-4">
            <p className="text-sm text-gray-600">
              Add a custom HTML form that submits directly to the CRM:
            </p>
            <div className="relative rounded-lg border border-gray-200 bg-gray-900 p-4 pr-24">
              <pre className="text-sm text-gray-100 whitespace-pre-wrap font-mono leading-relaxed">
                {htmlFormCode}
              </pre>
              <CopyButton text={htmlFormCode} />
            </div>
          </TabsContent>

          <TabsContent value="api" className="space-y-4 mt-4">
            <p className="text-sm text-gray-600">
              Use the REST API to submit leads programmatically:
            </p>
            <div className="relative rounded-lg border border-gray-200 bg-gray-900 p-4 pr-24">
              <pre className="text-sm text-gray-100 whitespace-pre-wrap font-mono leading-relaxed">
                {apiCode}
              </pre>
              <CopyButton text={apiCode} />
            </div>
          </TabsContent>

          <TabsContent value="wordpress" className="space-y-4 mt-4">
            <p className="text-sm text-gray-600">
              Use the WordPress shortcode to embed the form:
            </p>
            <div className="relative rounded-lg border border-gray-200 bg-gray-900 p-4 pr-24">
              <pre className="text-sm text-gray-100 whitespace-pre-wrap font-mono leading-relaxed">
                {wordpressCode}
              </pre>
              <CopyButton text={wordpressCode} />
            </div>
          </TabsContent>
        </Tabs>

        {/* Features */}
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 mt-2">
          <p className="text-sm font-semibold text-gray-900 mb-2">Features:</p>
          <ul className="space-y-1.5 text-sm text-gray-600">
            <li className="flex gap-2">
              <span className="text-gray-400">&bull;</span>
              Pre-styled responsive form
            </li>
            <li className="flex gap-2">
              <span className="text-gray-400">&bull;</span>
              Automatic data submission to CRM
            </li>
            <li className="flex gap-2">
              <span className="text-gray-400">&bull;</span>
              Real-time validation
            </li>
            <li className="flex gap-2">
              <span className="text-gray-400">&bull;</span>
              Customizable appearance
            </li>
          </ul>
        </div>

        <DialogFooter>
          <Button
            onClick={() => onOpenChange(false)}
            className="bg-[#dc2626] hover:bg-[#b91c1c] text-white"
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ===================== MAIN IMPORT LEADS COMPONENT =====================

export function ImportLeads() {
  const [csvOpen, setCsvOpen] = useState(false);
  const [webFormOpen, setWebFormOpen] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="gap-2">
            <Upload className="h-4 w-4" />
            Import
            <ChevronDown className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-[220px]">
          <DropdownMenuItem onClick={() => setCsvOpen(true)} className="gap-2 cursor-pointer">
            <Upload className="h-4 w-4" />
            Import from Excel/CSV
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setWebFormOpen(true)} className="gap-2 cursor-pointer">
            <Code2 className="h-4 w-4" />
            Website Form Integration
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ImportCSVDialog open={csvOpen} onOpenChange={setCsvOpen} />
      <WebFormDialog open={webFormOpen} onOpenChange={setWebFormOpen} />
    </>
  );
}

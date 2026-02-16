"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Plus, Upload } from "lucide-react";
import { createDocument, getDocumentFormData } from "@/lib/actions/documents";
import { FileDropzone } from "@/components/file-dropzone";
import type { DocumentCategory } from "@prisma/client";

const categories: { value: DocumentCategory; label: string }[] = [
  { value: "PASSPORT", label: "Passport" },
  { value: "TITLE_DEED", label: "Title Deed" },
  { value: "POWER_OF_ATTORNEY", label: "Power of Attorney" },
  { value: "CITIZENSHIP_APPLICATION", label: "Citizenship Application" },
  { value: "CONTRACT", label: "Contract" },
  { value: "BANK_STATEMENT", label: "Bank Statement" },
  { value: "PHOTO", label: "Photo" },
  { value: "BIRTH_CERTIFICATE", label: "Birth Certificate" },
  { value: "MARRIAGE_CERTIFICATE", label: "Marriage Certificate" },
  { value: "OTHER", label: "Other" },
];

interface FormDataType {
  clients: { id: string; firstName: string; lastName: string }[];
  applications: {
    id: string;
    applicationNumber: string | null;
    client: { firstName: string; lastName: string };
  }[];
}

export function UploadDocumentDialog() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formOptions, setFormOptions] = useState<FormDataType | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    fileUrl: "",
    fileType: "",
    category: "OTHER" as DocumentCategory,
    clientId: "",
    applicationId: "",
  });

  useEffect(() => {
    if (isOpen && !formOptions) {
      getDocumentFormData().then(setFormOptions);
    }
  }, [isOpen, formOptions]);

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    // Auto-fill name if empty
    if (!formData.name) {
      const nameWithoutExt = file.name
        .replace(/\.[^/.]+$/, "")
        .replace(/[_-]/g, " ");
      setFormData((prev) => ({ ...prev, name: nameWithoutExt }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) {
      setError("Document name is required");
      return;
    }
    if (!selectedFile && !formData.fileUrl) {
      setError("Please select a file to upload or provide a URL");
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      let fileUrl = formData.fileUrl;
      let fileType = formData.fileType;

      // Upload file if selected
      if (selectedFile) {
        setUploadProgress(true);
        const body = new FormData();
        body.append("file", selectedFile);
        body.append("subfolder", "documents");

        const res = await fetch("/api/upload", { method: "POST", body });
        const result = await res.json();
        setUploadProgress(false);

        if (!res.ok) {
          throw new Error(result.error || "Upload failed");
        }

        fileUrl = result.url;
        fileType = result.fileType;
      }

      await createDocument({
        name: formData.name,
        fileUrl,
        fileType: fileType || "application/octet-stream",
        category: formData.category,
        clientId:
          formData.clientId === "none"
            ? undefined
            : formData.clientId || undefined,
        applicationId:
          formData.applicationId === "none"
            ? undefined
            : formData.applicationId || undefined,
      });

      setIsOpen(false);
      setSelectedFile(null);
      setFormData({
        name: "",
        fileUrl: "",
        fileType: "",
        category: "OTHER",
        clientId: "",
        applicationId: "",
      });
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create document",
      );
    } finally {
      setIsSubmitting(false);
      setUploadProgress(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="bg-[#dc2626] hover:bg-[#dc2626]/90">
          <Plus className="h-4 w-4 mr-2" />
          Upload Document
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Upload Document</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="name">Document Name *</Label>
            <Input
              id="name"
              placeholder="e.g., John Doe - Passport"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Upload File</Label>
            <FileDropzone
              onFileSelect={handleFileSelect}
              accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.doc,.docx,.xls,.xlsx,.csv,.txt"
              disabled={isSubmitting}
            />
            {!selectedFile && (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground text-center">
                  or provide a URL
                </p>
                <Input
                  id="fileUrl"
                  placeholder="https://..."
                  value={formData.fileUrl}
                  onChange={(e) =>
                    setFormData({ ...formData, fileUrl: e.target.value })
                  }
                />
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Category *</Label>
            <Select
              value={formData.category}
              onValueChange={(value) =>
                setFormData({
                  ...formData,
                  category: value as DocumentCategory,
                })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="clientId">Link to Client (Optional)</Label>
            <Select
              value={formData.clientId}
              onValueChange={(value) =>
                setFormData({ ...formData, clientId: value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a client..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {formOptions?.clients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.firstName} {client.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="applicationId">
              Link to Citizenship Application (Optional)
            </Label>
            <Select
              value={formData.applicationId}
              onValueChange={(value) =>
                setFormData({ ...formData, applicationId: value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select an application..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {formOptions?.applications.map((app) => (
                  <SelectItem key={app.id} value={app.id}>
                    {app.applicationNumber || app.id.slice(0, 8)} -{" "}
                    {app.client.firstName} {app.client.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              <Upload className="h-4 w-4 mr-2" />
              {uploadProgress
                ? "Uploading file..."
                : isSubmitting
                  ? "Saving..."
                  : "Upload"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/use-toast";
import { Globe, DollarSign, Pencil, Check, X } from "lucide-react";
import { updateEnquiryField } from "@/lib/actions/enquiries";

const icons = {
  globe: Globe,
  dollar: DollarSign,
};

interface EditableInfoCardProps {
  enquiryId: string;
  field: string;
  label: string;
  value: string | null;
  icon: keyof typeof icons;
}

export function EditableInfoCard({
  enquiryId,
  field,
  label,
  value,
  icon,
}: EditableInfoCardProps) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [inputValue, setInputValue] = useState(value || "");
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const Icon = icons[icon];

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const handleSave = async () => {
    const trimmed = inputValue.trim();
    if (trimmed === (value || "")) {
      setEditing(false);
      return;
    }

    try {
      await updateEnquiryField(enquiryId, field, trimmed || null);
      setEditing(false);
      startTransition(() => router.refresh());
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to update",
      });
    }
  };

  const handleCancel = () => {
    setInputValue(value || "");
    setEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSave();
    if (e.key === "Escape") handleCancel();
  };

  return (
    <Card className={isPending ? "opacity-60" : ""}>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2 text-gray-500">
            <Icon className="h-4 w-4" />
            <span className="text-sm">{label}</span>
          </div>
          {!editing && (
            <button
              onClick={() => setEditing(true)}
              className="text-gray-400 hover:text-[#dc2626] transition-colors"
              title={`Edit ${label}`}
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        {editing ? (
          <div className="flex items-center gap-1.5 mt-1">
            <Input
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              className="h-8 text-sm"
              placeholder={`Enter ${label.toLowerCase()}`}
            />
            <button
              onClick={handleSave}
              className="shrink-0 rounded p-1.5 text-green-600 hover:bg-green-50 transition-colors"
            >
              <Check className="h-4 w-4" />
            </button>
            <button
              onClick={handleCancel}
              className="shrink-0 rounded p-1.5 text-gray-400 hover:bg-gray-100 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <p className="font-medium text-sm">
            {value || "Not specified"}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

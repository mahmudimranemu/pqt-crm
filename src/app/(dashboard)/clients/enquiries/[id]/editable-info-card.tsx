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

const BUDGET_OPTIONS = [
  { value: "Under $100K", label: "Under $100K" },
  { value: "$100K - $250K", label: "$100K - $250K" },
  { value: "$250K - $500K", label: "$250K - $500K" },
  { value: "$500K - $1M", label: "$500K - $1M" },
  { value: "Over $1M", label: "Over $1M" },
];

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
  const selectRef = useRef<HTMLSelectElement>(null);
  const Icon = icons[icon];
  const isBudget = field === "budget";

  useEffect(() => {
    if (editing) {
      if (isBudget && selectRef.current) {
        selectRef.current.focus();
      } else if (inputRef.current) {
        inputRef.current.focus();
        inputRef.current.select();
      }
    }
  }, [editing, isBudget]);

  const handleSave = async (newValue?: string) => {
    const trimmed = (newValue ?? inputValue).trim();
    if (trimmed === (value || "")) {
      setEditing(false);
      return;
    }

    try {
      await updateEnquiryField(enquiryId, field, trimmed || null);
      setInputValue(trimmed);
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

  const handleBudgetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setInputValue(val);
    handleSave(val);
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
          isBudget ? (
            <div className="flex items-center gap-1.5 mt-1">
              <select
                ref={selectRef}
                value={inputValue}
                onChange={handleBudgetChange}
                className="flex h-8 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">Select range</option>
                {BUDGET_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <button
                onClick={handleCancel}
                className="shrink-0 rounded p-1.5 text-gray-400 hover:bg-gray-100 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
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
                onClick={() => handleSave()}
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
          )
        ) : (
          <p className="font-medium text-sm">
            {value || "Not specified"}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

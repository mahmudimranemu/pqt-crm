"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { X, Plus, Tag } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const PRESET_TAGS = [
  "Cash Buyer",
  "First-time Buyer",
  "Investor",
  "Multiple Properties",
  "Pre-approved",
  "Relocating",
  "VIP",
  "Hot Lead",
  "Urgent",
];

interface TagManagerProps {
  entityId: string;
  tags: string[];
  onUpdate: (id: string, tags: string[]) => Promise<unknown>;
  compact?: boolean;
}

export function TagManager({
  entityId,
  tags,
  onUpdate,
  compact,
}: TagManagerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showInput, setShowInput] = useState(false);
  const [newTag, setNewTag] = useState("");

  function handleAddTag(tag: string) {
    if (!tag.trim() || tags.includes(tag.trim())) return;
    const updated = [...tags, tag.trim()];
    startTransition(async () => {
      await onUpdate(entityId, updated);
      router.refresh();
    });
    setNewTag("");
    setShowInput(false);
  }

  function handleRemoveTag(tag: string) {
    const updated = tags.filter((t) => t !== tag);
    startTransition(async () => {
      await onUpdate(entityId, updated);
      router.refresh();
    });
  }

  const availablePresets = PRESET_TAGS.filter((t) => !tags.includes(t));

  return (
    <div className={compact ? "space-y-2" : "space-y-3"}>
      {/* Current tags */}
      <div className="flex flex-wrap gap-1.5">
        {tags.length === 0 && (
          <span className="text-xs text-gray-400 italic">No tags</span>
        )}
        {tags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-gray-50 px-2.5 py-0.5 text-xs font-medium text-gray-700"
          >
            <Tag className="h-3 w-3" />
            {tag}
            <button
              onClick={() => handleRemoveTag(tag)}
              disabled={isPending}
              className="ml-0.5 rounded-full p-0.5 hover:bg-gray-200 transition-colors"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
      </div>

      {/* Add tag input */}
      {showInput ? (
        <div className="flex gap-2">
          <Input
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            placeholder="Type a tag..."
            className="h-8 text-xs"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAddTag(newTag);
              }
              if (e.key === "Escape") setShowInput(false);
            }}
            autoFocus
          />
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs"
            onClick={() => handleAddTag(newTag)}
            disabled={!newTag.trim() || isPending}
          >
            Add
          </Button>
        </div>
      ) : (
        <button
          onClick={() => setShowInput(true)}
          className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-[#dc2626] transition-colors"
        >
          <Plus className="h-3 w-3" />
          Add tag
        </button>
      )}

      {/* Preset tags */}
      {showInput && availablePresets.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {availablePresets.map((tag) => (
            <button
              key={tag}
              onClick={() => handleAddTag(tag)}
              disabled={isPending}
              className="rounded-full border border-dashed border-gray-300 px-2 py-0.5 text-xs text-gray-500 hover:border-[#dc2626] hover:text-[#dc2626] transition-colors"
            >
              + {tag}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

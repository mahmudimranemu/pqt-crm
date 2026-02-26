"use client";

import { useState, useEffect, useTransition } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { StickyNote, Trash2, Plus } from "lucide-react";
import {
  getUserNotes,
  addUserNote,
  deleteUserNote,
} from "@/lib/actions/user-profile";

interface Note {
  id: string;
  content: string;
  createdAt: Date | string;
  updatedAt?: Date | string;
  author: { id: string; firstName: string; lastName: string };
}

interface NotesTabProps {
  userId: string;
}

export function NotesTab({ userId }: NotesTabProps) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [newNote, setNewNote] = useState("");
  const [isPending, startTransition] = useTransition();
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    const fetchNotes = async () => {
      try {
        const data = await getUserNotes(userId);
        setNotes(data);
      } catch {
        // Failed to load
      } finally {
        setLoading(false);
      }
    };
    fetchNotes();
  }, [userId]);

  const handleAdd = () => {
    if (!newNote.trim() || isPending) return;

    const content = newNote.trim();
    setNewNote("");

    startTransition(async () => {
      try {
        const note = await addUserNote(userId, content);
        setNotes((prev) => [note, ...prev]);
      } catch {
        setNewNote(content);
      }
    });
  };

  const handleDelete = (noteId: string) => {
    setDeletingId(noteId);
    startTransition(async () => {
      try {
        await deleteUserNote(noteId);
        setNotes((prev) => prev.filter((n) => n.id !== noteId));
      } catch {
        // Failed to delete
      } finally {
        setDeletingId(null);
      }
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      handleAdd();
    }
  };

  const formatRelativeTime = (date: Date | string) => {
    const now = new Date();
    const d = new Date(date);
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  if (loading) {
    return (
      <Card className="border border-gray-200">
        <CardContent className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-[#dc2626]" />
            <p className="text-sm text-gray-500">Loading notes...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Add Note */}
      <Card className="border border-gray-200">
        <div className="border-b border-gray-100 p-5">
          <h2 className="text-lg font-semibold text-gray-900">Admin Notes</h2>
          <p className="text-sm text-gray-500">
            Internal notes and instructions for this user (visible to Super Admin
            only)
          </p>
        </div>
        <CardContent className="p-5">
          <Textarea
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Write a note or instruction for this user..."
            className="min-h-[80px] resize-none border-gray-200 focus:border-[#dc2626] focus:ring-[#dc2626]"
            rows={3}
          />
          <div className="mt-3 flex items-center justify-between">
            <p className="text-[10px] text-gray-400">Press Cmd+Enter to save</p>
            <Button
              onClick={handleAdd}
              disabled={!newNote.trim() || isPending}
              className="bg-[#dc2626] hover:bg-[#b91c1c] text-white"
              size="sm"
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Add Note
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Notes List */}
      {notes.length === 0 ? (
        <Card className="border border-gray-200">
          <CardContent className="py-12 text-center">
            <StickyNote className="mx-auto mb-4 h-12 w-12 text-gray-300" />
            <p className="text-gray-500">No notes yet.</p>
            <p className="mt-1 text-sm text-gray-400">
              Add a note above to get started.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {notes.map((note) => (
            <Card key={note.id} className="border border-gray-200">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-red-100 text-[10px] font-medium text-red-700">
                        {note.author.firstName[0]}
                        {note.author.lastName[0]}
                      </div>
                      <span className="text-sm font-medium text-gray-900">
                        {note.author.firstName} {note.author.lastName}
                      </span>
                      <span className="text-xs text-gray-400">
                        {formatRelativeTime(note.createdAt)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">
                      {note.content}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(note.id)}
                    disabled={deletingId === note.id}
                    className="h-8 w-8 p-0 text-gray-400 hover:text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

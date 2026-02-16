"use client";

import { useState, useTransition } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { updateEnquiryStatus } from "@/lib/actions/enquiries";
import { Phone, Mail, GripVertical, Globe } from "lucide-react";
import Link from "next/link";

const STATUSES = [
  { key: "NEW", label: "New", color: "bg-blue-100 text-blue-700" },
  {
    key: "ASSIGNED",
    label: "Assigned",
    color: "bg-indigo-100 text-indigo-700",
  },
  {
    key: "CONTACTED",
    label: "Contacted",
    color: "bg-purple-100 text-purple-700",
  },
  {
    key: "CONVERTED_TO_CLIENT",
    label: "Converted",
    color: "bg-emerald-100 text-emerald-700",
  },
  { key: "SPAM", label: "Spam", color: "bg-red-100 text-red-700" },
  { key: "CLOSED", label: "Closed", color: "bg-gray-100 text-gray-700" },
] as const;

type EnquiryStatusKey = (typeof STATUSES)[number]["key"];

interface EnquiryCard {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  status: string;
  source: string;
  budget: string | null;
  country: string | null;
  priority: string | null;
  tags: string[];
  createdAt: string;
  assignedAgent: { id: string; firstName: string; lastName: string } | null;
  interestedProperty: { id: string; name: string } | null;
}

interface EnquiryKanbanProps {
  initialData: Record<string, EnquiryCard[]>;
}

const priorityColors: Record<string, string> = {
  High: "bg-red-100 text-red-700",
  Medium: "bg-yellow-100 text-yellow-700",
  Low: "bg-green-100 text-green-700",
};

const sourceLabels: Record<string, string> = {
  WEBSITE_FORM: "Website",
  PHONE_CALL: "Phone",
  EMAIL: "Email",
  WALK_IN: "Walk-in",
  REFERRAL: "Referral",
  SOCIAL_MEDIA: "Social",
  PROPERTY_PORTAL: "Portal",
  OTHER: "Other",
};

export function EnquiryKanban({ initialData }: EnquiryKanbanProps) {
  const [data, setData] = useState(initialData);
  const [draggedEnquiry, setDraggedEnquiry] = useState<{
    enquiry: EnquiryCard;
    fromStatus: string;
  } | null>(null);
  const [dragOverStatus, setDragOverStatus] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleDragStart = (enquiry: EnquiryCard, status: string) => {
    setDraggedEnquiry({ enquiry, fromStatus: status });
  };

  const handleDragOver = (e: React.DragEvent, status: string) => {
    e.preventDefault();
    setDragOverStatus(status);
  };

  const handleDragLeave = () => {
    setDragOverStatus(null);
  };

  const handleDrop = (e: React.DragEvent, toStatus: string) => {
    e.preventDefault();
    setDragOverStatus(null);

    if (!draggedEnquiry || draggedEnquiry.fromStatus === toStatus) {
      setDraggedEnquiry(null);
      return;
    }

    const { enquiry, fromStatus } = draggedEnquiry;

    // Optimistic update
    setData((prev) => {
      const updated = { ...prev };
      updated[fromStatus] = (updated[fromStatus] || []).filter(
        (e) => e.id !== enquiry.id,
      );
      updated[toStatus] = [
        ...(updated[toStatus] || []),
        { ...enquiry, status: toStatus },
      ];
      return updated;
    });

    startTransition(async () => {
      try {
        await updateEnquiryStatus(enquiry.id, toStatus as EnquiryStatusKey);
      } catch {
        // Revert on error
        setData((prev) => {
          const reverted = { ...prev };
          reverted[toStatus] = (reverted[toStatus] || []).filter(
            (e) => e.id !== enquiry.id,
          );
          reverted[fromStatus] = [...(reverted[fromStatus] || []), enquiry];
          return reverted;
        });
      }
    });

    setDraggedEnquiry(null);
  };

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {STATUSES.map((status) => {
        const enquiries = data[status.key] || [];

        return (
          <div
            key={status.key}
            className={cn(
              "flex min-w-[280px] max-w-[280px] flex-col rounded-xl bg-gray-50 transition-colors",
              dragOverStatus === status.key &&
                "bg-blue-50 ring-2 ring-blue-200",
            )}
            onDragOver={(e) => handleDragOver(e, status.key)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, status.key)}
          >
            {/* Column Header */}
            <div className="flex items-center justify-between p-3 pb-2">
              <div className="flex items-center gap-2">
                <Badge className={cn("text-xs font-medium", status.color)}>
                  {status.label}
                </Badge>
                <span className="text-xs font-medium text-gray-400">
                  {enquiries.length}
                </span>
              </div>
            </div>

            {/* Cards */}
            <div
              className="flex-1 space-y-2 overflow-y-auto px-3 pb-3"
              style={{ maxHeight: "calc(100vh - 400px)" }}
            >
              {enquiries.map((enquiry) => (
                <Card
                  key={enquiry.id}
                  draggable
                  onDragStart={() => handleDragStart(enquiry, status.key)}
                  className={cn(
                    "cursor-grab border border-gray-200 bg-white p-3 transition-shadow hover:shadow-md active:cursor-grabbing",
                    isPending && "opacity-70",
                  )}
                >
                  <div className="flex items-start gap-2">
                    <GripVertical className="mt-0.5 h-4 w-4 shrink-0 text-gray-300" />
                    <div className="flex-1 min-w-0">
                      <Link
                        href={`/clients/enquiries/${enquiry.id}`}
                        className="text-sm font-medium text-gray-900 hover:text-[#dc2626] line-clamp-1"
                      >
                        {enquiry.firstName} {enquiry.lastName}
                      </Link>

                      <div className="mt-1 flex items-center gap-1.5 text-xs text-gray-500">
                        <Mail className="h-3 w-3 shrink-0" />
                        <span className="truncate">{enquiry.email}</span>
                      </div>

                      {enquiry.phone && (
                        <div className="mt-0.5 flex items-center gap-1.5 text-xs text-gray-500">
                          <Phone className="h-3 w-3 shrink-0" />
                          <span>{enquiry.phone}</span>
                        </div>
                      )}

                      <div className="mt-2 flex flex-wrap items-center gap-1">
                        <Badge
                          variant="outline"
                          className="text-[10px] px-1.5 py-0"
                        >
                          <Globe className="mr-0.5 h-2.5 w-2.5" />
                          {sourceLabels[enquiry.source] || enquiry.source}
                        </Badge>
                        {enquiry.priority && (
                          <Badge
                            className={cn(
                              "text-[10px] px-1.5 py-0",
                              priorityColors[enquiry.priority] ||
                                "bg-gray-100 text-gray-600",
                            )}
                          >
                            {enquiry.priority}
                          </Badge>
                        )}
                        {enquiry.country && (
                          <Badge
                            variant="outline"
                            className="text-[10px] px-1.5 py-0"
                          >
                            {enquiry.country}
                          </Badge>
                        )}
                      </div>

                      <div className="mt-2 flex items-center justify-between">
                        {enquiry.budget && (
                          <span className="text-xs text-gray-500">
                            {enquiry.budget}
                          </span>
                        )}
                        {enquiry.assignedAgent && (
                          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-gray-100 text-[9px] font-medium text-gray-600">
                            {enquiry.assignedAgent.firstName[0]}
                            {enquiry.assignedAgent.lastName[0]}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              ))}

              {enquiries.length === 0 && (
                <div className="py-8 text-center text-xs text-gray-400">
                  No enquiries
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

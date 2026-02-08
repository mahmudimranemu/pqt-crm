"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, User } from "lucide-react";
import { addFamilyMember } from "@/lib/actions/citizenship";
import type { Relationship, FamilyMemberStatus } from "@prisma/client";

interface FamilyMember {
  id: string;
  firstName: string;
  lastName: string;
  relationship: Relationship;
  dateOfBirth: Date | null;
  passportNumber: string | null;
  status: FamilyMemberStatus;
}

interface FamilyMembersListProps {
  applicationId: string;
  members: FamilyMember[];
}

const relationshipLabels: Record<Relationship, string> = {
  SPOUSE: "Spouse",
  CHILD: "Child",
};

const statusColors: Record<
  FamilyMemberStatus,
  "default" | "secondary" | "success" | "warning" | "destructive"
> = {
  INCLUDED: "success",
  EXCLUDED: "secondary",
  APPROVED: "success",
  REJECTED: "destructive",
};

export function FamilyMembersList({
  applicationId,
  members,
}: FamilyMembersListProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    relationship: "SPOUSE" as Relationship,
    passportNumber: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      await addFamilyMember({
        applicationId,
        ...formData,
      });
      setIsOpen(false);
      setFormData({
        firstName: "",
        lastName: "",
        relationship: "SPOUSE",
        passportNumber: "",
      });
      router.refresh();
    } catch (error) {
      console.error("Failed to add family member:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {members.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          No family members added yet.
        </p>
      ) : (
        <div className="space-y-2">
          {members.map((member) => (
            <div
              key={member.id}
              className="flex items-center justify-between p-3 rounded-lg border"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                  <User className="h-4 w-4" />
                </div>
                <div>
                  <p className="font-medium">
                    {member.firstName} {member.lastName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {relationshipLabels[member.relationship]}
                    {member.passportNumber && ` - ${member.passportNumber}`}
                  </p>
                </div>
              </div>
              <Badge variant={statusColors[member.status]}>
                {member.status.replace("_", " ")}
              </Badge>
            </div>
          ))}
        </div>
      )}

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Add Family Member
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Family Member</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  value={formData.firstName}
                  onChange={(e) =>
                    setFormData({ ...formData, firstName: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) =>
                    setFormData({ ...formData, lastName: e.target.value })
                  }
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="relationship">Relationship</Label>
              <Select
                value={formData.relationship}
                onValueChange={(value) =>
                  setFormData({
                    ...formData,
                    relationship: value as Relationship,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SPOUSE">Spouse</SelectItem>
                  <SelectItem value="CHILD">Child</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="passportNumber">Passport Number</Label>
              <Input
                id="passportNumber"
                value={formData.passportNumber}
                onChange={(e) =>
                  setFormData({ ...formData, passportNumber: e.target.value })
                }
              />
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
                {isSubmitting ? "Adding..." : "Add Member"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

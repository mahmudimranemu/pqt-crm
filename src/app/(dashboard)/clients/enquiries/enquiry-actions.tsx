"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/use-toast";
import {
  MoreHorizontal,
  UserPlus,
  UserCheck,
  Ban,
  Trash2,
  ExternalLink,
  Loader2
} from "lucide-react";
import {
  assignEnquiry,
  convertToClient,
  markAsSpam,
  updateEnquiryStatus
} from "@/lib/actions/enquiries";
import type { Enquiry, User } from "@prisma/client";

interface Agent {
  id: string;
  firstName: string;
  lastName: string;
  office: string;
}

interface EnquiryWithRelations extends Enquiry {
  assignedAgent: { id: string; firstName: string; lastName: string } | null;
  convertedClient: { id: string; firstName: string; lastName: string } | null;
}

interface EnquiryActionsProps {
  enquiry: EnquiryWithRelations;
  agents: Agent[];
}

const nationalities = [
  "Bangladeshi", "British", "Emirati", "Indian", "Iranian", "Iraqi",
  "Kuwaiti", "Malaysian", "Pakistani", "Saudi", "Turkish", "Other"
];

const countries = [
  "Bangladesh", "India", "Iran", "Iraq", "Kuwait", "Malaysia",
  "Pakistan", "Saudi Arabia", "Turkey", "United Arab Emirates",
  "United Kingdom", "Other"
];

export function EnquiryActions({ enquiry, agents }: EnquiryActionsProps) {
  const router = useRouter();
  const [isConverting, setIsConverting] = useState(false);
  const [showConvertDialog, setShowConvertDialog] = useState(false);
  const [convertData, setConvertData] = useState({
    nationality: "",
    country: "",
    budgetMin: 200000,
    budgetMax: 500000,
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleAssign = async (agentId: string) => {
    try {
      await assignEnquiry(enquiry.id, agentId);
      toast({
        title: "Enquiry assigned",
        description: "The enquiry has been assigned successfully.",
      });
      router.refresh();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to assign enquiry",
      });
    }
  };

  const handleMarkContacted = async () => {
    try {
      await updateEnquiryStatus(enquiry.id, "CONTACTED");
      toast({
        title: "Status updated",
        description: "The enquiry has been marked as contacted.",
      });
      router.refresh();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update status",
      });
    }
  };

  const handleConvert = async () => {
    setIsLoading(true);
    try {
      const { client } = await convertToClient(enquiry.id, convertData);
      toast({
        title: "Converted to client",
        description: "The enquiry has been converted to a client.",
      });
      setShowConvertDialog(false);
      router.push(`/clients/${client.id}`);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to convert enquiry",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleMarkSpam = async () => {
    try {
      await markAsSpam(enquiry.id);
      toast({
        title: "Marked as spam",
        description: "The enquiry has been marked as spam.",
      });
      router.refresh();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to mark as spam",
      });
    }
  };

  const isConverted = enquiry.status === "CONVERTED_TO_CLIENT";
  const isSpam = enquiry.status === "SPAM";

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {/* Assign to Agent */}
          {!isConverted && !isSpam && (
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <UserCheck className="mr-2 h-4 w-4" />
                Assign to Agent
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                {agents.map((agent) => (
                  <DropdownMenuItem
                    key={agent.id}
                    onClick={() => handleAssign(agent.id)}
                  >
                    {agent.firstName} {agent.lastName}
                    <span className="ml-2 text-muted-foreground text-xs">
                      ({agent.office})
                    </span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          )}

          {/* Mark as Contacted */}
          {!isConverted && !isSpam && enquiry.status !== "CONTACTED" && (
            <DropdownMenuItem onClick={handleMarkContacted}>
              <UserCheck className="mr-2 h-4 w-4" />
              Mark as Contacted
            </DropdownMenuItem>
          )}

          {/* Convert to Client */}
          {!isConverted && !isSpam && (
            <DropdownMenuItem onClick={() => setShowConvertDialog(true)}>
              <UserPlus className="mr-2 h-4 w-4" />
              Convert to Client
            </DropdownMenuItem>
          )}

          {/* View Client (if converted) */}
          {isConverted && enquiry.convertedClient && (
            <DropdownMenuItem asChild>
              <Link href={`/clients/${enquiry.convertedClient.id}`}>
                <ExternalLink className="mr-2 h-4 w-4" />
                View Client
              </Link>
            </DropdownMenuItem>
          )}

          <DropdownMenuSeparator />

          {/* Mark as Spam */}
          {!isConverted && !isSpam && (
            <DropdownMenuItem
              onClick={handleMarkSpam}
              className="text-amber-600"
            >
              <Ban className="mr-2 h-4 w-4" />
              Mark as Spam
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Convert to Client Dialog */}
      <Dialog open={showConvertDialog} onOpenChange={setShowConvertDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Convert to Client</DialogTitle>
            <DialogDescription>
              Convert this enquiry into a client. Please provide additional details.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>First Name</Label>
                <Input value={enquiry.firstName} disabled />
              </div>
              <div className="space-y-2">
                <Label>Last Name</Label>
                <Input value={enquiry.lastName} disabled />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Nationality</Label>
              <Select
                value={convertData.nationality}
                onValueChange={(value) =>
                  setConvertData((prev) => ({ ...prev, nationality: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select nationality" />
                </SelectTrigger>
                <SelectContent>
                  {nationalities.map((nat) => (
                    <SelectItem key={nat} value={nat}>
                      {nat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Country</Label>
              <Select
                value={convertData.country}
                onValueChange={(value) =>
                  setConvertData((prev) => ({ ...prev, country: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select country" />
                </SelectTrigger>
                <SelectContent>
                  {countries.map((country) => (
                    <SelectItem key={country} value={country}>
                      {country}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Budget Min (USD)</Label>
                <Input
                  type="number"
                  value={convertData.budgetMin}
                  onChange={(e) =>
                    setConvertData((prev) => ({
                      ...prev,
                      budgetMin: parseInt(e.target.value) || 0,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Budget Max (USD)</Label>
                <Input
                  type="number"
                  value={convertData.budgetMax}
                  onChange={(e) =>
                    setConvertData((prev) => ({
                      ...prev,
                      budgetMax: parseInt(e.target.value) || 0,
                    }))
                  }
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowConvertDialog(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleConvert} disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Convert to Client
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

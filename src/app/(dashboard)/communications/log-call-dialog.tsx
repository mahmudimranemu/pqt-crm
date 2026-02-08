"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Plus, Phone } from "lucide-react";
import { logCall, getCallLogFormData } from "@/lib/actions/communications";
import type { CallType, CallOutcome } from "@prisma/client";

interface Client {
  id: string;
  firstName: string;
  lastName: string;
  phone: string | null;
}

export function LogCallDialog() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clients, setClients] = useState<Client[]>([]);

  const [formData, setFormData] = useState({
    clientId: "",
    callType: "OUTBOUND" as CallType,
    outcome: "CONNECTED" as CallOutcome,
    duration: 0,
    notes: "",
  });

  useEffect(() => {
    if (isOpen && clients.length === 0) {
      getCallLogFormData().then(setClients);
    }
  }, [isOpen, clients.length]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setIsSubmitting(true);
      setError(null);

      await logCall({
        clientId:
          formData.clientId === "none"
            ? undefined
            : formData.clientId || undefined,
        callType: formData.callType,
        outcome: formData.outcome,
        duration: formData.duration,
        notes: formData.notes || undefined,
      });

      setIsOpen(false);
      setFormData({
        clientId: "",
        callType: "OUTBOUND",
        outcome: "CONNECTED",
        duration: 0,
        notes: "",
      });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to log call");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="bg-[#dc2626] hover:bg-[#dc2626]/90">
          <Plus className="h-4 w-4 mr-2" />
          Log Call
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Log Call</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="clientId">Client (Optional)</Label>
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
                <SelectItem value="none">General Call</SelectItem>
                {clients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.firstName} {client.lastName}
                    {client.phone && ` - ${client.phone}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="callType">Call Type</Label>
              <Select
                value={formData.callType}
                onValueChange={(value) =>
                  setFormData({ ...formData, callType: value as CallType })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="OUTBOUND">Outbound</SelectItem>
                  <SelectItem value="INBOUND">Inbound</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="outcome">Outcome</Label>
              <Select
                value={formData.outcome}
                onValueChange={(value) =>
                  setFormData({ ...formData, outcome: value as CallOutcome })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CONNECTED">Connected</SelectItem>
                  <SelectItem value="VOICEMAIL">Voicemail</SelectItem>
                  <SelectItem value="NO_ANSWER">No Answer</SelectItem>
                  <SelectItem value="BUSY">Busy</SelectItem>
                  <SelectItem value="WRONG_NUMBER">Wrong Number</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="duration">Duration (seconds)</Label>
            <Input
              id="duration"
              type="number"
              min="0"
              value={formData.duration}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  duration: parseInt(e.target.value) || 0,
                })
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Call summary and key points discussed..."
              value={formData.notes}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
              rows={3}
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
              <Phone className="h-4 w-4 mr-2" />
              {isSubmitting ? "Logging..." : "Log Call"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

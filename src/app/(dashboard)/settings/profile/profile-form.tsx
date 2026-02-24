"use client";

import { useState, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { updateUser, requestEmailChange } from "@/lib/actions/users";
import { CheckCircle, Upload, Loader2 } from "lucide-react";
import Image from "next/image";

interface ProfileFormProps {
  userId: string;
  userRole: string;
  initialData: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    avatar: string;
  };
}

export function ProfileForm({ userId, userRole, initialData }: ProfileFormProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState(initialData);

  // Email change state
  const [newEmail, setNewEmail] = useState("");
  const [showEmailChange, setShowEmailChange] = useState(false);
  const [emailPending, startEmailTransition] = useTransition();
  const [emailStatus, setEmailStatus] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const isSuperAdmin = userRole === "SUPER_ADMIN";

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      setError("Please select a JPG, PNG, GIF, or WebP image.");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setError("Image must be less than 2MB.");
      return;
    }

    try {
      setIsUploading(true);
      setError(null);

      const uploadData = new FormData();
      uploadData.append("file", file);
      uploadData.append("subfolder", "avatars");

      const response = await fetch("/api/upload", {
        method: "POST",
        body: uploadData,
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || "Failed to upload image");
      }

      const result = await response.json();
      setFormData((prev) => ({ ...prev, avatar: result.url }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload avatar");
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      setError(null);
      setSuccess(false);

      await updateUser(userId, {
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone || undefined,
        avatar: formData.avatar || undefined,
      });
      setSuccess(true);
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to update profile",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEmailChange = () => {
    if (!newEmail.trim()) return;
    setEmailStatus(null);

    startEmailTransition(async () => {
      try {
        await requestEmailChange(newEmail.trim());
        setEmailStatus({
          type: "success",
          message: `Verification email sent to ${newEmail.trim()}. Check your inbox to confirm the change.`,
        });
        setNewEmail("");
        setShowEmailChange(false);
      } catch (err) {
        setEmailStatus({
          type: "error",
          message:
            err instanceof Error ? err.message : "Failed to request email change",
        });
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {success && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-600">
            Profile updated successfully!
          </AlertDescription>
        </Alert>
      )}

      {/* Avatar Section */}
      <div className="flex items-center gap-4">
        <div className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gray-200 text-xl font-bold text-gray-500">
          {formData.avatar ? (
            <Image
              src={formData.avatar}
              alt="Avatar"
              fill
              className="object-cover"
            />
          ) : (
            <>
              {formData.firstName[0]}
              {formData.lastName[0]}
            </>
          )}
        </div>
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            className="hidden"
            onChange={handleAvatarUpload}
          />
          <Button
            type="button"
            size="sm"
            className="bg-[#dc2626] hover:bg-[#b91c1c] text-white"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            {isUploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Change Avatar
              </>
            )}
          </Button>
          <p className="mt-1 text-xs text-gray-500">
            JPG, PNG, GIF or WebP. Max 2MB.
          </p>
        </div>
      </div>

      {/* Name Fields */}
      <div className="grid gap-4 sm:grid-cols-2">
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

      {/* Email and Phone */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            disabled
            className="bg-gray-50 text-gray-500"
          />
          {isSuperAdmin ? (
            <div>
              {!showEmailChange ? (
                <button
                  type="button"
                  onClick={() => setShowEmailChange(true)}
                  className="text-xs text-[#dc2626] hover:underline"
                >
                  Change email address
                </button>
              ) : (
                <div className="mt-2 space-y-2">
                  <div className="flex gap-2">
                    <Input
                      type="email"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      placeholder="Enter new email address"
                      className="text-sm"
                      disabled={emailPending}
                    />
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleEmailChange}
                      disabled={emailPending || !newEmail.trim()}
                      className="bg-[#dc2626] hover:bg-[#b91c1c] text-white shrink-0"
                    >
                      {emailPending ? (
                        <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                      ) : null}
                      {emailPending ? "Sending..." : "Verify Email"}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setShowEmailChange(false);
                        setNewEmail("");
                        setEmailStatus(null);
                      }}
                      disabled={emailPending}
                    >
                      Cancel
                    </Button>
                  </div>
                  <p className="text-xs text-gray-400">
                    A verification email will be sent to the new address.
                  </p>
                </div>
              )}
              {emailStatus && (
                <p
                  className={`text-xs mt-1 ${emailStatus.type === "success" ? "text-green-600" : "text-red-600"}`}
                >
                  {emailStatus.message}
                </p>
              )}
            </div>
          ) : (
            <p className="text-xs text-gray-400">
              Contact an admin to change your email.
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Phone</Label>
          <Input
            id="phone"
            type="tel"
            value={formData.phone}
            onChange={(e) =>
              setFormData({ ...formData, phone: e.target.value })
            }
            placeholder="+1 (555) 123-4567"
          />
        </div>
      </div>

      <div className="flex items-center gap-3 pt-2">
        <Button
          type="submit"
          disabled={isSubmitting}
          className="bg-[#dc2626] hover:bg-[#b91c1c] text-white"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            "Save Changes"
          )}
        </Button>
      </div>
    </form>
  );
}

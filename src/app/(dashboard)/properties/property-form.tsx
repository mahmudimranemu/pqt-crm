"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createProperty, updateProperty, type PropertyFormData } from "@/lib/actions/properties";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/use-toast";
import { Loader2, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Property } from "@prisma/client";

const propertySchema = z.object({
  name: z.string().min(1, "Name is required"),
  developer: z.string().optional(),
  district: z.string().min(1, "District is required"),
  address: z.string().optional(),
  propertyType: z.string().min(1, "Property type is required"),
  totalUnits: z.number().optional(),
  availableUnits: z.number().optional(),
  priceFrom: z.number().min(1, "Minimum price is required"),
  priceTo: z.number().min(1, "Maximum price is required"),
  sizeFrom: z.number().optional(),
  sizeTo: z.number().optional(),
  bedrooms: z.string().optional(),
  status: z.string(),
  description: z.string().optional(),
});

type FormData = z.infer<typeof propertySchema>;

interface PropertyFormProps {
  property?: Property;
}

const districtOptions = [
  { value: "BEYLIKDUZU", label: "Beylikduzu" },
  { value: "BASAKSEHIR", label: "Basaksehir" },
  { value: "ESENYURT", label: "Esenyurt" },
  { value: "KUCUKCEKMECE", label: "Kucukcekmece" },
  { value: "BAHCESEHIR", label: "Bahcesehir" },
  { value: "BAKIRKOY", label: "Bakirkoy" },
  { value: "SISLI", label: "Sisli" },
  { value: "BESIKTAS", label: "Besiktas" },
  { value: "KADIKOY", label: "Kadikoy" },
  { value: "USKUDAR", label: "Uskudar" },
  { value: "MALTEPE", label: "Maltepe" },
  { value: "KARTAL", label: "Kartal" },
  { value: "PENDIK", label: "Pendik" },
  { value: "TUZLA", label: "Tuzla" },
  { value: "AVCILAR", label: "Avcilar" },
  { value: "BEYOGLU", label: "Beyoglu" },
  { value: "FATIH", label: "Fatih" },
  { value: "SARIYER", label: "Sariyer" },
  { value: "BEYKOZ", label: "Beykoz" },
  { value: "ZEYTINBURNU", label: "Zeytinburnu" },
];

const propertyTypeOptions = [
  { value: "APARTMENT", label: "Apartment" },
  { value: "VILLA", label: "Villa" },
  { value: "PENTHOUSE", label: "Penthouse" },
  { value: "COMMERCIAL", label: "Commercial" },
  { value: "LAND", label: "Land" },
];

const statusOptions = [
  { value: "ACTIVE", label: "Active" },
  { value: "SOLD_OUT", label: "Sold Out" },
  { value: "COMING_SOON", label: "Coming Soon" },
  { value: "OFF_MARKET", label: "Off Market" },
];

const commonAmenities = [
  "Pool", "Gym", "Sauna", "Parking", "Security", "Sea View",
  "Concierge", "Kids Club", "Playground", "Garden", "Terrace",
  "Smart Home", "Metro Access", "Mall Access", "Private Beach"
];

export function PropertyForm({ property }: PropertyFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [amenities, setAmenities] = useState<string[]>(property?.amenities || []);
  const [newAmenity, setNewAmenity] = useState("");
  const isEditing = !!property;

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(propertySchema),
    defaultValues: property
      ? {
          name: property.name,
          developer: property.developer || "",
          district: property.district,
          address: property.address || "",
          propertyType: property.propertyType,
          totalUnits: property.totalUnits || undefined,
          availableUnits: property.availableUnits || undefined,
          priceFrom: Number(property.priceFrom),
          priceTo: Number(property.priceTo),
          sizeFrom: property.sizeFrom ? Number(property.sizeFrom) : undefined,
          sizeTo: property.sizeTo ? Number(property.sizeTo) : undefined,
          bedrooms: property.bedrooms || "",
          status: property.status,
          description: property.description || "",
        }
      : {
          status: "ACTIVE",
          priceFrom: 200000,
          priceTo: 500000,
        },
  });

  const addAmenity = (amenity: string) => {
    if (amenity && !amenities.includes(amenity)) {
      setAmenities([...amenities, amenity]);
    }
    setNewAmenity("");
  };

  const removeAmenity = (amenity: string) => {
    setAmenities(amenities.filter((a) => a !== amenity));
  };

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    try {
      const formData: PropertyFormData = {
        ...data,
        district: data.district as PropertyFormData["district"],
        propertyType: data.propertyType as PropertyFormData["propertyType"],
        status: data.status as PropertyFormData["status"],
        amenities,
        images: property?.images || [],
        floorPlans: property?.floorPlans || [],
      };

      if (isEditing) {
        await updateProperty(property.id, formData);
        toast({
          title: "Property updated",
          description: "The property has been updated successfully.",
        });
      } else {
        await createProperty(formData);
        toast({
          title: "Property created",
          description: "The property has been created successfully.",
        });
      }
      router.push("/properties");
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Something went wrong",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Property Name *</Label>
              <Input
                id="name"
                {...register("name")}
                placeholder="Marina Residence"
              />
              {errors.name && (
                <p className="text-sm text-red-500">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="developer">Developer</Label>
              <Input
                id="developer"
                {...register("developer")}
                placeholder="Emaar Turkey"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="district">District *</Label>
              <Select
                value={watch("district")}
                onValueChange={(value) => setValue("district", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select district" />
                </SelectTrigger>
                <SelectContent>
                  {districtOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.district && (
                <p className="text-sm text-red-500">{errors.district.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                {...register("address")}
                placeholder="Full address"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="propertyType">Property Type *</Label>
                <Select
                  value={watch("propertyType")}
                  onValueChange={(value) => setValue("propertyType", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {propertyTypeOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status *</Label>
                <Select
                  value={watch("status")}
                  onValueChange={(value) => setValue("status", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bedrooms">Bedrooms</Label>
              <Input
                id="bedrooms"
                {...register("bedrooms")}
                placeholder="1+1, 2+1, 3+1"
              />
            </div>
          </CardContent>
        </Card>

        {/* Pricing & Units */}
        <Card>
          <CardHeader>
            <CardTitle>Pricing & Units</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="priceFrom">Price From (USD) *</Label>
                <Input
                  id="priceFrom"
                  type="number"
                  {...register("priceFrom", { valueAsNumber: true })}
                  placeholder="200000"
                />
                {errors.priceFrom && (
                  <p className="text-sm text-red-500">{errors.priceFrom.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="priceTo">Price To (USD) *</Label>
                <Input
                  id="priceTo"
                  type="number"
                  {...register("priceTo", { valueAsNumber: true })}
                  placeholder="500000"
                />
                {errors.priceTo && (
                  <p className="text-sm text-red-500">{errors.priceTo.message}</p>
                )}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="sizeFrom">Size From (sqm)</Label>
                <Input
                  id="sizeFrom"
                  type="number"
                  {...register("sizeFrom", { valueAsNumber: true })}
                  placeholder="75"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sizeTo">Size To (sqm)</Label>
                <Input
                  id="sizeTo"
                  type="number"
                  {...register("sizeTo", { valueAsNumber: true })}
                  placeholder="200"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="totalUnits">Total Units</Label>
                <Input
                  id="totalUnits"
                  type="number"
                  {...register("totalUnits", { valueAsNumber: true })}
                  placeholder="200"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="availableUnits">Available Units</Label>
                <Input
                  id="availableUnits"
                  type="number"
                  {...register("availableUnits", { valueAsNumber: true })}
                  placeholder="45"
                />
              </div>
            </div>

            {/* Amenities */}
            <div className="space-y-2">
              <Label>Amenities</Label>
              <div className="flex flex-wrap gap-2 mb-2">
                {amenities.map((amenity) => (
                  <Badge key={amenity} variant="secondary" className="gap-1">
                    {amenity}
                    <button
                      type="button"
                      onClick={() => removeAmenity(amenity)}
                      className="ml-1 hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Add amenity..."
                  value={newAmenity}
                  onChange={(e) => setNewAmenity(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addAmenity(newAmenity);
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => addAmenity(newAmenity)}
                >
                  Add
                </Button>
              </div>
              <div className="flex flex-wrap gap-1 mt-2">
                {commonAmenities
                  .filter((a) => !amenities.includes(a))
                  .slice(0, 8)
                  .map((amenity) => (
                    <Button
                      key={amenity}
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-xs"
                      onClick={() => addAmenity(amenity)}
                    >
                      + {amenity}
                    </Button>
                  ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Description */}
      <Card>
        <CardHeader>
          <CardTitle>Description</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            {...register("description")}
            placeholder="Describe the property, its features, and unique selling points..."
            rows={6}
          />
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-4">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isEditing ? "Update Property" : "Create Property"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}

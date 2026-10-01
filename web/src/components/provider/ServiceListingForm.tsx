import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { serviceCategoryApi } from "../../api/serviceCategories";
import { serviceListingsApi } from "../../api/serviceListings";

import { Save, Clock, Banknote, Type, AlignLeft } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

interface ServiceListingFormProps {
  initialData?: any; // If null, means Create. If exists, means Update.
  onClose: () => void;
}

export default function ServiceListingForm({ initialData, onClose }: ServiceListingFormProps) {
  const isEditing = !!initialData;
  const queryClient = useQueryClient();

  const { data: categories = [] } = useQuery({
    queryKey: ["serviceCategories"],
    queryFn: serviceCategoryApi.getServiceCategories,
  });

  const [formData, setFormData] = useState({
    title: "",
    serviceCategoryId: "",
    description: "",
    scope: "",
    availability: "",
    fixedPrice: "",
    estimatedDuration: "01:00:00", // Default to 1 hour (HH:mm:ss)
    isActive: true,
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        title: initialData.title,
        serviceCategoryId: initialData.serviceCategoryId,
        description: initialData.description,
        scope: initialData.scope || "",
        availability: initialData.availability || "",
        fixedPrice: initialData.fixedPrice.toString(),
        estimatedDuration: initialData.estimatedDuration,
        isActive: initialData.isActive,
      });
    } else if (categories.length > 0) {
      setFormData((prev) => ({ ...prev, serviceCategoryId: categories[0].id }));
    }
  }, [initialData, categories]);

  const mutation = useMutation({
    mutationFn: (data: any) =>
      isEditing
        ? serviceListingsApi.updateServiceListing(initialData.id, data)
        : serviceListingsApi.createServiceListing(data as any),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["myServiceListings"] });
      onClose();
    },
    onError: (err: any) => {
      alert(err.response?.data?.error || "Error saving service listing.");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...formData,
      fixedPrice: parseFloat(formData.fixedPrice),
    };
    mutation.mutate(payload);
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto bg-card text-card-foreground border-border">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            {isEditing ? "Edit Service Listing" : "Create Service Listing"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Service Category</Label>
              <select
                value={formData.serviceCategoryId}
                onChange={(e) => setFormData({ ...formData, serviceCategoryId: e.target.value })}
                required
                className="w-full h-9 border border-input bg-background px-3 py-1 text-sm text-foreground shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <Type className="h-4 w-4" /> Service Name
              </Label>
              <Input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g. Deep Home Cleaning"
                maxLength={100}
              />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <Banknote className="h-4 w-4" /> Fixed Price (LKR)
              </Label>
              <Input
                type="number"
                step="0.01"
                min="1"
                required
                value={formData.fixedPrice}
                onChange={(e) => setFormData({ ...formData, fixedPrice: e.target.value })}
                placeholder="0.00"
              />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <Clock className="h-4 w-4" /> Time Required (HH:MM:SS)
              </Label>
              <Input
                type="text"
                required
                value={formData.estimatedDuration}
                onChange={(e) => setFormData({ ...formData, estimatedDuration: e.target.value })}
                placeholder="02:00:00"
                pattern="^\d{2}:\d{2}:\d{2}$"
                title="Use exact time format: Hours:Minutes:Seconds"
              />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label className="flex items-center gap-1.5">
                <Clock className="h-4 w-4" /> Availability Details
              </Label>
              <Input
                type="text"
                required
                value={formData.availability}
                onChange={(e) => setFormData({ ...formData, availability: e.target.value })}
                placeholder="e.g., Weekdays 9 AM - 5 PM"
                maxLength={100}
              />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label className="flex items-center gap-1.5">
                <AlignLeft className="h-4 w-4" /> Description
              </Label>
              <Textarea
                required
                rows={4}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Clearly describe what this service includes generally..."
                maxLength={1000}
              />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label className="flex items-center gap-1.5">
                <AlignLeft className="h-4 w-4" /> Scope of Work
              </Label>
              <Textarea
                required
                rows={2}
                value={formData.scope}
                onChange={(e) => setFormData({ ...formData, scope: e.target.value })}
                placeholder="Specifically define what is included and excluded."
                maxLength={500}
              />
            </div>
          </div>

          <div className="flex items-center space-x-2 pt-2">
            <Checkbox
              id="isActive"
              checked={formData.isActive}
              onCheckedChange={(checked) => setFormData({ ...formData, isActive: !!checked })}
            />
            <label htmlFor="isActive" className="text-sm font-medium leading-none cursor-pointer">
              Visible to customers instantly
            </label>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending} className="flex items-center gap-2">
              <Save className="h-4 w-4" /> {mutation.isPending ? "Saving..." : "Save Listing"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

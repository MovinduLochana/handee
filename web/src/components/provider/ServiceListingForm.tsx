import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { serviceCategoryApi } from "../../api/serviceCategories";
import { serviceListingsApi } from "../../api/serviceListings";
import { X, Save, Clock, Banknote, Type, AlignLeft, Info } from "lucide-react";
import type { ServiceListingDto } from "../../api/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";

interface ServiceListingFormProps {
  initialData?: ServiceListingDto | null;
  onClose: () => void;
}

const DURATION_OPTIONS = [
  { hours: 1, label: "1 Hour (1 predefined slot)" },
  { hours: 2, label: "2 Hours (2 consecutive slots)" },
  { hours: 3, label: "3 Hours (3 consecutive slots)" },
  { hours: 4, label: "4 Hours (4 consecutive slots)" },
  { hours: 5, label: "5 Hours (5 consecutive slots)" },
  { hours: 6, label: "6 Hours (6 consecutive slots)" },
  { hours: 7, label: "7 Hours (7 consecutive slots)" },
  { hours: 8, label: "8 Hours (Full day / 8 slots)" },
];

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
    fixedPrice: "",
    durationHours: 1,
    isActive: true,
  });

  useEffect(() => {
    if (initialData) {
      let parsedHours = initialData.durationHours;
      if (!parsedHours && initialData.estimatedDuration) {
        const match = initialData.estimatedDuration.match(/^(\d+)/);
        parsedHours = match ? Math.min(8, Math.max(1, parseInt(match[1], 10))) : 1;
      }

      setFormData({
        title: initialData.title,
        serviceCategoryId: initialData.serviceCategoryId,
        description: initialData.description,
        scope: initialData.scope || "",
        fixedPrice: initialData.fixedPrice.toString(),
        durationHours: parsedHours || 1,
        isActive: initialData.isActive,
      });
    } else if (categories.length > 0) {
      setFormData((prev) => ({
        ...prev,
        serviceCategoryId: prev.serviceCategoryId || categories[0].id,
      }));
    }
  }, [initialData, categories]);

  const mutation = useMutation({
    mutationFn: (data: any) =>
      isEditing
        ? serviceListingsApi.updateServiceListing(initialData!.id, data)
        : serviceListingsApi.createServiceListing(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["myServiceListings"] });
      onClose();
    },
    onError: (err: any) => {
      alert(
        err.response?.data?.message || err.response?.data?.error || "Error saving service listing.",
      );
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const hours = Math.min(8, Math.max(1, Number(formData.durationHours) || 1));
    const payload = {
      title: formData.title.trim(),
      serviceCategoryId: formData.serviceCategoryId,
      description: formData.description.trim(),
      scope: formData.scope.trim(),
      availability: "Available",
      fixedPrice: parseFloat(formData.fixedPrice),
      durationHours: hours,
      estimatedDuration: `${String(hours).padStart(2, "0")}:00:00`,
      isActive: formData.isActive,
    };
    mutation.mutate(payload);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-card text-card-foreground border border-border shadow-2xl w-full max-w-xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-lg font-bold text-foreground tracking-tight">
            {isEditing ? "Edit Service Listing" : "Create Service Listing"}
          </h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8 rounded-none hover:bg-muted text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Service Category</Label>
              <select
                value={formData.serviceCategoryId}
                onChange={(e) => setFormData({ ...formData, serviceCategoryId: e.target.value })}
                required
                className="w-full h-8 rounded-none border border-input bg-transparent px-2.5 py-1 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id} className="bg-card text-card-foreground">
                    {c.iconUrl} {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold flex items-center gap-1.5">
                <Type className="h-3.5 w-3.5 text-muted-foreground" /> Service Name
              </Label>
              <Input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g. Deep Home Cleaning"
                maxLength={100}
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold flex items-center gap-1.5">
                <Banknote className="h-3.5 w-3.5 text-muted-foreground" /> Fixed Price (LKR)
              </Label>
              <Input
                type="number"
                step="0.01"
                min="1"
                required
                value={formData.fixedPrice}
                onChange={(e) => setFormData({ ...formData, fixedPrice: e.target.value })}
                placeholder="0.00"
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-muted-foreground" /> Time Required (1–8 Hours)
              </Label>
              <select
                value={formData.durationHours}
                onChange={(e) =>
                  setFormData({ ...formData, durationHours: parseInt(e.target.value, 10) })
                }
                required
                className="w-full h-8 rounded-none border border-input bg-transparent px-2.5 py-1 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                {DURATION_OPTIONS.map((opt) => (
                  <option key={opt.hours} value={opt.hours} className="bg-card text-card-foreground">
                    {opt.label}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-muted-foreground">
                Reserves {formData.durationHours} consecutive 1-hour slot(s) from your schedule.
              </p>
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs font-semibold flex items-center gap-1.5">
                <AlignLeft className="h-3.5 w-3.5 text-muted-foreground" /> Description
              </Label>
              <Textarea
                required
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Clearly describe what this service includes generally..."
                maxLength={1000}
                className="text-xs resize-none"
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs font-semibold flex items-center gap-1.5">
                <AlignLeft className="h-3.5 w-3.5 text-muted-foreground" /> Scope of Work
              </Label>
              <Textarea
                required
                rows={2}
                value={formData.scope}
                onChange={(e) => setFormData({ ...formData, scope: e.target.value })}
                placeholder={`Specifically define what is included (e.g., ${formData.durationHours} hour(s) of labor, basic tools) and what is excluded.`}
                maxLength={500}
                className="text-xs resize-none"
              />
            </div>
          </div>

          <div className="p-3 bg-muted/40 border border-border flex items-start gap-2.5 text-xs text-muted-foreground">
            <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <span>
              Bookings for this service are partitioned into 1-hour slots matching your active
              operating schedule. Customer bookings take place exclusively in the Handee Mobile App.
            </span>
          </div>

          <div className="flex items-center space-x-2 pt-1">
            <Checkbox
              id="isActive"
              checked={formData.isActive}
              onCheckedChange={(checked) => setFormData({ ...formData, isActive: !!checked })}
            />
            <Label htmlFor="isActive" className="text-xs cursor-pointer">
              Visible to customers instantly
            </Label>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2 pt-4 border-t border-border">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={mutation.isPending}>
              <Save className="h-4 w-4 mr-1.5" /> {mutation.isPending ? "Saving..." : "Save Listing"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { serviceCategoryApi } from "../../api/serviceCategories";
import { serviceListingsApi } from "../../api/serviceListings";
import { X, Save, Clock, Banknote, Type, AlignLeft, Info } from "lucide-react";
import type { ServiceListingDto } from "../../api/types";

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
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2>{isEditing ? "Edit Service Listing" : "Create Service Listing"}</h2>
          <button onClick={onClose} className="btn-close">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="listing-form">
          <div className="form-grid">
            <div className="form-group">
              <label>Service Category</label>
              <select
                value={formData.serviceCategoryId}
                onChange={(e) => setFormData({ ...formData, serviceCategoryId: e.target.value })}
                required
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.iconUrl} {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>
                <Type size={16} /> Service Name
              </label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g. Deep Home Cleaning"
                maxLength={100}
              />
            </div>

            <div className="form-group">
              <label>
                <Banknote size={16} /> Fixed Price (LKR)
              </label>
              <input
                type="number"
                step="0.01"
                min="1"
                required
                value={formData.fixedPrice}
                onChange={(e) => setFormData({ ...formData, fixedPrice: e.target.value })}
                placeholder="0.00"
              />
            </div>

            <div className="form-group">
              <label>
                <Clock size={16} /> Time Required (Integer Hours, 1–8)
              </label>
              <select
                value={formData.durationHours}
                onChange={(e) =>
                  setFormData({ ...formData, durationHours: parseInt(e.target.value, 10) })
                }
                required
              >
                {DURATION_OPTIONS.map((opt) => (
                  <option key={opt.hours} value={opt.hours}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "2px" }}>
                Each service reserves {formData.durationHours} consecutive 1-hour slot(s) from your
                schedule.
              </span>
            </div>

            <div className="form-group col-span-2">
              <label>
                <AlignLeft size={16} /> Description
              </label>
              <textarea
                required
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Clearly describe what this service includes generally..."
                maxLength={1000}
              />
            </div>

            <div className="form-group col-span-2">
              <label>
                <AlignLeft size={16} /> Scope of Work
              </label>
              <textarea
                required
                rows={2}
                value={formData.scope}
                onChange={(e) => setFormData({ ...formData, scope: e.target.value })}
                placeholder={`Specifically define what is included (e.g., ${formData.durationHours} hour(s) of labor, basic tools) and what is excluded.`}
                maxLength={500}
              />
            </div>
          </div>

          <div
            style={{
              padding: "10px 14px",
              background: "var(--bg, #f8fafc)",
              border: "1px solid var(--border)",
              borderRadius: "8px",
              display: "flex",
              alignItems: "center",
              gap: "10px",
              fontSize: "0.825rem",
              color: "var(--text-muted)",
            }}
          >
            <Info size={16} color="var(--accent, #0284c7)" style={{ flexShrink: 0 }} />
            <span>
              Bookings for this service are partitioned into 1-hour slots matching your active
              operating schedule. Customer bookings take place exclusively in the Handee Mobile App.
            </span>
          </div>

          <div className="form-checkbox">
            <input
              type="checkbox"
              id="isActive"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
            />
            <label htmlFor="isActive">Visible to customers instantly</label>
          </div>

          <div className="modal-actions">
            <button type="button" onClick={onClose} className="btn-cancel">
              Cancel
            </button>
            <button type="submit" disabled={mutation.isPending} className="btn-save">
              <Save size={18} /> {mutation.isPending ? "Saving..." : "Save Listing"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

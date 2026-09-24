import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { serviceCategoryApi } from "../../api/serviceCategories";
import { serviceListingsApi } from "../../api/serviceListings";

import { X, Save, Clock, Banknote, Type, AlignLeft } from "lucide-react";
import "./ServiceListingForm.css";

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
        mutationFn: (data: any) => isEditing ? serviceListingsApi.updateServiceListing(initialData.id, data) : serviceListingsApi.createServiceListing(data as any),
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
        <div className="modal-overlay">
            <div className="modal-content">
                <div className="modal-header">
                    <h2>{isEditing ? "Edit Service Listing" : "Create Service Listing"}</h2>
                    <button onClick={onClose} className="btn-close"><X size={20} /></button>
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
                            <label><Type size={16} /> Service Name</label>
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
                            <label><Banknote size={16} /> Fixed Price (LKR)</label>
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
                            <label><Clock size={16} /> Time Required (HH:MM:SS)</label>
                            <input
                                type="text"
                                required
                                value={formData.estimatedDuration}
                                onChange={(e) => setFormData({ ...formData, estimatedDuration: e.target.value })}
                                placeholder="02:00:00"
                                pattern="^\d{2}:\d{2}:\d{2}$"
                                title="Use exact time format: Hours:Minutes:Seconds"
                            />
                        </div>

                        <div className="form-group col-span-2">
                            <label><Clock size={16} /> Availability Details</label>
                            <input
                                type="text"
                                required
                                value={formData.availability}
                                onChange={(e) => setFormData({ ...formData, availability: e.target.value })}
                                placeholder="e.g., Weekdays 9 AM - 5 PM"
                                maxLength={100}
                            />
                        </div>

                        <div className="form-group col-span-2">
                            <label><AlignLeft size={16} /> Description</label>
                            <textarea
                                required
                                rows={4}
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                placeholder="Clearly describe what this service includes generally..."
                                maxLength={1000}
                            />
                        </div>

                        <div className="form-group col-span-2">
                            <label><AlignLeft size={16} /> Scope of Work</label>
                            <textarea
                                required
                                rows={2}
                                value={formData.scope}
                                onChange={(e) => setFormData({ ...formData, scope: e.target.value })}
                                placeholder="Specifically define what is included (e.g., 2 hours of deep cleaning) and what is excluded."
                                maxLength={500}
                            />
                        </div>
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
                        <button type="button" onClick={onClose} className="btn-cancel">Cancel</button>
                        <button type="submit" disabled={mutation.isPending} className="btn-save">
                            <Save size={18} /> {mutation.isPending ? "Saving..." : "Save Listing"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

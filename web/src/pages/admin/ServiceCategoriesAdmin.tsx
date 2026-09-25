import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { serviceCategoryApi } from "../../api/serviceCategories";
import { Plus, Trash2, Edit2, Loader2, Save, X, Tag } from "lucide-react";

// Curated set of trade/service-relevant emojis
const TRADE_EMOJIS = [
  "🔧",
  "🪛",
  "🔨",
  "🪚",
  "🔩",
  "⚡",
  "💡",
  "🔌",
  "🪫",
  "🔋",
  "🚿",
  "🪠",
  "🛁",
  "🚰",
  "💧",
  "🏗️",
  "🧱",
  "🪟",
  "🚪",
  "🏠",
  "🌿",
  "🌳",
  "✂️",
  "🪜",
  "🧲",
  "🎨",
  "🖌️",
  "🧹",
  "🧺",
  "🧴",
  "🚗",
  "🔑",
  "📦",
  "📋",
  "🛡️",
];

function EmojiPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);

  return (
    <div style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        title="Pick an icon"
        style={{
          width: 48,
          height: 48,
          fontSize: "1.5rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          border: "1px solid #d1d5db",
          borderRadius: 8,
          background: "white",
          cursor: "pointer",
          flexShrink: 0,
        }}
      >
        {value || <Tag size={20} color="#9ca3af" />}
      </button>
      {open && (
        <div
          style={{
            position: "absolute",
            zIndex: 50,
            top: 54,
            left: 0,
            background: "white",
            border: "1px solid #e5e7eb",
            borderRadius: 10,
            boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
            padding: "0.75rem",
            width: 260,
            display: "grid",
            gridTemplateColumns: "repeat(7, 1fr)",
            gap: 4,
          }}
        >
          {/* Clear option */}
          <button
            type="button"
            title="No icon"
            onClick={() => {
              onChange("");
              setOpen(false);
            }}
            style={{
              width: 32,
              height: 32,
              fontSize: "0.65rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "1px dashed #d1d5db",
              borderRadius: 6,
              background: value === "" ? "#fee2e2" : "white",
              cursor: "pointer",
              color: "#9ca3af",
            }}
          >
            ✕
          </button>
          {TRADE_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              title={emoji}
              onClick={() => {
                onChange(emoji);
                setOpen(false);
              }}
              style={{
                width: 32,
                height: 32,
                fontSize: "1.1rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: "1px solid",
                borderColor: value === emoji ? "#2563eb" : "transparent",
                borderRadius: 6,
                background: value === emoji ? "#eff6ff" : "transparent",
                cursor: "pointer",
                transition: "all 0.1s",
              }}
            >
              {emoji}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function CategoryRow({
  cat,
  onEdit,
  onDelete,
}: {
  cat: { id: string; name: string; iconUrl: string | null };
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
      <td style={{ padding: "1rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <span
            style={{
              width: 36,
              height: 36,
              fontSize: "1.25rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "#f3f4f6",
              borderRadius: 8,
              flexShrink: 0,
            }}
          >
            {cat.iconUrl || <Tag size={16} color="#9ca3af" />}
          </span>
          <span style={{ fontWeight: 500 }}>{cat.name}</span>
        </div>
      </td>
      <td style={{ padding: "1rem", color: "#6b7280", fontSize: "0.9rem" }}>
        {cat.iconUrl ? (
          <code style={{ background: "#f3f4f6", padding: "2px 6px", borderRadius: 4 }}>
            {cat.iconUrl}
          </code>
        ) : (
          <span style={{ color: "#d1d5db" }}>—</span>
        )}
      </td>
      <td style={{ padding: "1rem", textAlign: "right" }}>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
          <button
            onClick={onEdit}
            style={{
              background: "none",
              border: "none",
              color: "#4b5563",
              cursor: "pointer",
              padding: "4px",
            }}
          >
            <Edit2 size={16} />
          </button>
          <button
            onClick={onDelete}
            style={{
              background: "none",
              border: "none",
              color: "#ef4444",
              cursor: "pointer",
              padding: "4px",
            }}
          >
            <Trash2 size={16} />
          </button>
        </div>
      </td>
    </tr>
  );
}

function EditRow({
  initial,
  onSave,
  onCancel,
  isPending,
}: {
  initial: { name: string; iconUrl: string };
  onSave: (data: { name: string; iconUrl: string | null }) => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  const [name, setName] = useState(initial.name);
  const [icon, setIcon] = useState(initial.iconUrl);

  return (
    <tr style={{ borderBottom: "1px solid #e5e7eb", background: "#f0f9ff" }}>
      <td style={{ padding: "1rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <EmojiPicker value={icon} onChange={setIcon} />
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Category name"
            style={{
              padding: "0.5rem 0.75rem",
              border: "1px solid #d1d5db",
              borderRadius: 6,
              flex: 1,
              fontSize: "0.9rem",
            }}
            autoFocus
          />
        </div>
      </td>
      <td style={{ padding: "1rem", color: "#9ca3af", fontSize: "0.85rem" }}>
        {icon ? (
          <span>
            Preview: <span style={{ fontSize: "1.5rem" }}>{icon}</span>
          </span>
        ) : (
          "No icon selected"
        )}
      </td>
      <td style={{ padding: "1rem", textAlign: "right" }}>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
          <button
            onClick={() => onSave({ name, iconUrl: icon || null })}
            disabled={isPending || !name.trim()}
            style={{
              background: "#10b981",
              color: "white",
              border: "none",
              padding: "0.5rem 0.75rem",
              borderRadius: 6,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "0.25rem",
            }}
          >
            <Save size={14} /> Save
          </button>
          <button
            onClick={onCancel}
            style={{
              background: "#f3f4f6",
              color: "#374151",
              border: "none",
              padding: "0.5rem 0.75rem",
              borderRadius: 6,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "0.25rem",
            }}
          >
            <X size={14} /> Cancel
          </button>
        </div>
      </td>
    </tr>
  );
}

export default function ServiceCategoriesAdmin() {
  const queryClient = useQueryClient();
  const { data: categories = [], isLoading } = useQuery({
    queryKey: ["serviceCategories"],
    queryFn: serviceCategoryApi.getServiceCategories,
  });

  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const createMutation = useMutation({
    mutationFn: serviceCategoryApi.createServiceCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["serviceCategories"] });
      setIsCreating(false);
    },
    onError: (err: any) =>
      alert(err.response?.data?.error || "A category with that name already exists."),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      serviceCategoryApi.updateServiceCategory(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["serviceCategories"] });
      setEditingId(null);
    },
    onError: (err: any) => alert(err.response?.data?.error || "Error updating category."),
  });

  const deleteMutation = useMutation({
    mutationFn: serviceCategoryApi.deleteServiceCategory,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["serviceCategories"] }),
    onError: (err: any) =>
      alert(
        err.response?.data?.error || "Cannot delete — providers may still reference this category.",
      ),
  });

  return (
    <div style={{ padding: "2rem", maxWidth: "860px", margin: "0 auto" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "1.5rem",
        }}
      >
        <div>
          <h2 style={{ margin: 0 }}>Service Categories</h2>
          <p style={{ margin: "4px 0 0", color: "#6b7280", fontSize: "0.875rem" }}>
            {categories.length} categor{categories.length === 1 ? "y" : "ies"} · Pick an emoji as
            the icon
          </p>
        </div>
        <button
          onClick={() => {
            setIsCreating(true);
            setEditingId(null);
          }}
          disabled={isCreating}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            padding: "0.6rem 1.1rem",
            background: "#2563eb",
            color: "white",
            border: "none",
            borderRadius: 8,
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          <Plus size={16} /> New Category
        </button>
      </div>

      <div
        style={{
          backgroundColor: "white",
          borderRadius: 10,
          boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
          overflow: "visible",
        }}
      >
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead style={{ backgroundColor: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
            <tr>
              <th
                style={{
                  padding: "0.875rem 1rem",
                  textAlign: "left",
                  color: "#374151",
                  fontWeight: 600,
                  fontSize: "0.875rem",
                }}
              >
                Category
              </th>
              <th
                style={{
                  padding: "0.875rem 1rem",
                  textAlign: "left",
                  color: "#374151",
                  fontWeight: 600,
                  fontSize: "0.875rem",
                }}
              >
                Icon value
              </th>
              <th
                style={{
                  padding: "0.875rem 1rem",
                  textAlign: "right",
                  color: "#374151",
                  fontWeight: 600,
                  fontSize: "0.875rem",
                }}
              >
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={3} style={{ padding: "2.5rem", textAlign: "center" }}>
                  <Loader2 size={24} className="animate-spin" style={{ color: "#2563eb" }} />
                </td>
              </tr>
            )}

            {/* New category row */}
            {isCreating && (
              <EditRow
                initial={{ name: "", iconUrl: "" }}
                onSave={(data) => createMutation.mutate(data)}
                onCancel={() => setIsCreating(false)}
                isPending={createMutation.isPending}
              />
            )}

            {categories.map((cat) =>
              editingId === cat.id ? (
                <EditRow
                  key={cat.id}
                  initial={{ name: cat.name, iconUrl: cat.iconUrl || "" }}
                  onSave={(data) => updateMutation.mutate({ id: cat.id, data })}
                  onCancel={() => setEditingId(null)}
                  isPending={updateMutation.isPending}
                />
              ) : (
                <CategoryRow
                  key={cat.id}
                  cat={cat}
                  onEdit={() => {
                    setEditingId(cat.id);
                    setIsCreating(false);
                  }}
                  onDelete={() => {
                    if (confirm(`Delete "${cat.name}"?`)) deleteMutation.mutate(cat.id);
                  }}
                />
              ),
            )}

            {categories.length === 0 && !isCreating && !isLoading && (
              <tr>
                <td colSpan={3} style={{ padding: "3rem", textAlign: "center", color: "#9ca3af" }}>
                  No categories yet. Click <strong>New Category</strong> to add one.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

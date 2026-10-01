import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { serviceCategoryApi } from "../../api/serviceCategories";
import { Plus, Trash2, Edit2, Loader2, Save, X, Tag } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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
    <div className="relative">
      <Button
        type="button"
        variant="outline"
        onClick={() => setOpen((o) => !o)}
        title="Pick an icon"
        className="h-10 w-10 text-xl p-0 flex items-center justify-center shrink-0"
      >
        {value || <Tag className="h-4 w-4 text-muted-foreground" />}
      </Button>
      {open && (
        <div className="absolute z-50 top-12 left-0 bg-popover text-popover-foreground border border-border rounded-lg shadow-lg p-3 w-64 grid grid-cols-7 gap-1">
          {/* Clear option */}
          <button
            type="button"
            title="No icon"
            onClick={() => {
              onChange("");
              setOpen(false);
            }}
            className={`h-7 w-7 text-xs flex items-center justify-center border border-dashed rounded transition-colors ${
              value === ""
                ? "bg-destructive/10 border-destructive text-destructive"
                : "border-border text-muted-foreground hover:bg-muted"
            }`}
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
              className={`h-7 w-7 text-base flex items-center justify-center rounded border transition-colors ${
                value === emoji
                  ? "border-primary bg-primary/10"
                  : "border-transparent hover:bg-muted"
              }`}
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
    <TableRow>
      <TableCell>
        <div className="flex items-center gap-3">
          <span className="h-9 w-9 text-lg flex items-center justify-center bg-muted rounded shrink-0">
            {cat.iconUrl || <Tag className="h-4 w-4 text-muted-foreground" />}
          </span>
          <span className="font-medium text-foreground text-sm">{cat.name}</span>
        </div>
      </TableCell>
      <TableCell className="text-muted-foreground text-xs">
        {cat.iconUrl ? (
          <code className="bg-muted px-1.5 py-0.5 rounded font-mono">{cat.iconUrl}</code>
        ) : (
          <span className="text-muted-foreground/60">—</span>
        )}
      </TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={onEdit}
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
          >
            <Edit2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onDelete}
            className="h-8 w-8 text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
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
    <TableRow className="bg-muted/30">
      <TableCell>
        <div className="flex items-center gap-3">
          <EmojiPicker value={icon} onChange={setIcon} />
          <Input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Category name"
            className="h-9 text-xs flex-1"
            autoFocus
          />
        </div>
      </TableCell>
      <TableCell className="text-xs text-muted-foreground">
        {icon ? (
          <span>
            Preview: <span className="text-lg ml-1">{icon}</span>
          </span>
        ) : (
          "No icon selected"
        )}
      </TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-2">
          <Button
            size="sm"
            onClick={() => onSave({ name, iconUrl: icon || null })}
            disabled={isPending || !name.trim()}
            className="h-8 text-xs gap-1"
          >
            <Save className="h-3.5 w-3.5" /> Save
          </Button>
          <Button variant="outline" size="sm" onClick={onCancel} className="h-8 text-xs gap-1">
            <X className="h-3.5 w-3.5" /> Cancel
          </Button>
        </div>
      </TableCell>
    </TableRow>
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
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Service Categories</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {categories.length} categor{categories.length === 1 ? "y" : "ies"} · Pick an emoji as
            the icon
          </p>
        </div>
        <Button
          onClick={() => {
            setIsCreating(true);
            setEditingId(null);
          }}
          disabled={isCreating}
          className="gap-2"
        >
          <Plus className="h-4 w-4" /> New Category
        </Button>
      </div>

      <Card className="overflow-visible">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Category</TableHead>
              <TableHead>Icon value</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={3} className="p-12 text-center text-muted-foreground">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
                </TableCell>
              </TableRow>
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
              <TableRow>
                <TableCell colSpan={3} className="p-12 text-center text-muted-foreground text-sm">
                  No categories yet. Click <strong className="text-foreground">New Category</strong>{" "}
                  to add one.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

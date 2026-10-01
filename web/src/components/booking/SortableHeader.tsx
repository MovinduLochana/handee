import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import type { SortState } from "./tableSort";

interface SortableHeaderProps<K extends string> {
  label: string;
  sortKey: K;
  sort: SortState<K>;
  onSort: (key: K) => void;
}

export default function SortableHeader<K extends string>({
  label,
  sortKey,
  sort,
  onSort,
}: SortableHeaderProps<K>) {
  const isActive = sort.key === sortKey;
  const Icon = !isActive ? ArrowUpDown : sort.direction === "asc" ? ArrowUp : ArrowDown;

  return (
    <th
      aria-sort={isActive ? (sort.direction === "asc" ? "ascending" : "descending") : "none"}
      className="h-10 px-4 text-left align-middle font-medium text-muted-foreground"
    >
      <button
        type="button"
        className="booking-sort-btn inline-flex items-center gap-1.5 text-xs font-semibold tracking-wider uppercase text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        onClick={() => onSort(sortKey)}
      >
        {label}
        <Icon className="h-3 w-3 shrink-0" />
      </button>
    </th>
  );
}

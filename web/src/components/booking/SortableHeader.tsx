import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import type { SortState } from "./tableSort";
import "./BookingComponents.css";

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
    <th aria-sort={isActive ? (sort.direction === "asc" ? "ascending" : "descending") : "none"}>
      <button type="button" className="booking-sort-btn" onClick={() => onSort(sortKey)}>
        {label}
        <Icon size={12} />
      </button>
    </th>
  );
}

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";

export type TimeRange = '1h' | '4h' | '6h' | '24h' | '1w' | '1m' | '6m' | '12m';

interface TimeRangeFilterProps {
  value: TimeRange;
  onChange: (value: TimeRange) => void;
}

export function TimeRangeFilter({ value, onChange }: TimeRangeFilterProps) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-[120px]">
        <SelectValue placeholder="Time Range" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="1h">Last hour</SelectItem>
        <SelectItem value="4h">Last 4 hours</SelectItem>
        <SelectItem value="6h">Last 6 hours</SelectItem>
        <SelectItem value="24h">Last 24 hours</SelectItem>
        <SelectItem value="1w">Last week</SelectItem>
        <SelectItem value="1m">Last month</SelectItem>
        <SelectItem value="6m">Last 6 months</SelectItem>
        <SelectItem value="12m">Last 12 months</SelectItem>
      </SelectContent>
    </Select>
  );
}
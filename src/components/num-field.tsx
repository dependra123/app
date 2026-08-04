import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function NumField({
  label,
  value,
  onChange,
  suffix,
  step = 1,
  className,
  placeholder,
}: {
  label?: string;
  value: number;
  onChange: (v: number) => void;
  suffix?: string;
  step?: number;
  className?: string;
  placeholder?: string;
}) {
  return (
    <div className={className}>
      {label ? <Label className="label-caps mb-1 block">{label}</Label> : null}
      <div className="relative">
        <Input
          type="number"
          inputMode="decimal"
          step={step}
          value={Number.isFinite(value) ? value : ""}
          placeholder={placeholder ?? ""}
          onChange={(e) => onChange(e.target.value === "" ? 0 : Number(e.target.value))}
          className="num pr-12"
        />
        {suffix ? (
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
            {suffix}
          </span>
        ) : null}
      </div>
    </div>
  );
}

export function CellInput({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <input
      type="number"
      inputMode="decimal"
      value={Number.isFinite(value) ? value : ""}
      onChange={(e) => onChange(e.target.value === "" ? 0 : Number(e.target.value))}
      className="num w-16 rounded border border-transparent bg-transparent px-1 py-0.5 text-right text-xs hover:border-border focus:border-ring focus:bg-card focus:outline-none"
    />
  );
}
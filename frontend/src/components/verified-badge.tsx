import { CheckCircle2, ShieldCheck } from "lucide-react";

interface VerifiedBadgeProps {
  status?: string | null;
  certifications?: string | null;
  className?: string;
  showCertTooltip?: boolean;
}

export function VerifiedBadge({
  status,
  certifications,
  className = "",
  showCertTooltip = true,
}: VerifiedBadgeProps) {
  const normStatus = (status || "").toLowerCase().trim();

  if (normStatus !== "verified" && normStatus !== "premium") {
    return null;
  }

  const isPremium = normStatus === "premium";
  const titleText = showCertTooltip && certifications
    ? `${isPremium ? "Premium Verified Supplier" : "Verified Supplier"}: ${certifications}`
    : isPremium
    ? "Premium Verified Supplier"
    : "Verified Supplier";

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold tracking-wide transition-colors ${
        isPremium
          ? "border border-amber-400/40 bg-butter/50 text-amber-900 dark:text-amber-200"
          : "border border-primary/30 bg-sage/35 text-foreground dark:text-foreground"
      } ${className}`}
      title={titleText}
      data-testid={`badge-${normStatus}`}
    >
      {isPremium ? (
        <ShieldCheck className="size-3 text-amber-600 dark:text-amber-400" />
      ) : (
        <CheckCircle2 className="size-3 text-primary" />
      )}
      <span>{isPremium ? "Premium" : "Verified"}</span>
    </span>
  );
}

export function formatRupees(amount: number | string | null | undefined): string {
  if (amount == null || amount === "") return "—";
  const num = typeof amount === "string" ? Number(amount) : amount;
  if (!Number.isFinite(num)) {
    return formatRupeeText(String(amount));
  }
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: num % 1 === 0 ? 0 : 2,
  }).format(num);
}

export function formatRupeeText(text: string | null | undefined): string {
  if (!text) return "";
  // Replace $ or USD with ₹ symbol and adjust formatting
  return text
    .replace(/\$\s*(\d+(?:,\d+)*(?:\.\d+)?)/g, (_match, numStr) => {
      const cleanNum = Number(numStr.replace(/,/g, ""));
      return Number.isFinite(cleanNum) ? formatRupees(cleanNum) : `₹${numStr}`;
    })
    .replace(/\$/g, "₹")
    .replace(/\bUSD\b/g, "₹");
}

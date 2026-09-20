import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ArrowRight, Check, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { ApiError, api, entityId } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ErrorState, PageSkeleton } from "@/components/states";

type Kind = "client" | "supplier";
type Values = Record<string, string>;
const categories = ["Manufacturing", "Packaging", "Food & beverage", "Textiles", "Technology", "Logistics", "Other"];

const configs = {
  client: {
    title: "Tell us what you need",
    intro: "Share the practical details. We’ll use them to find suppliers who fit, not just suppliers who sound similar.",
    name: ["company_name", "Company name", "e.g. Northstar Foods"],
    product: ["product_requirement", "What are you looking for?", "Describe the product, materials, specifications, or standards you need."],
    quantity: ["quantity_required", "Quantity required"],
    money: ["budget", "Budget"],
    timeline: ["delivery_timeline", "Delivery timeline", "e.g. Within 6 weeks"],
  },
  supplier: {
    title: "Introduce your supply offer",
    intro: "A clear, specific profile helps the right buyers understand where you’re strongest.",
    name: ["supplier_name", "Supplier name", "e.g. Goodgrain Packaging"],
    product: ["product_offered", "What do you offer?", "Describe your products, materials, capabilities, or certifications."],
    quantity: ["available_quantity", "Available quantity"],
    money: ["pricing_details", "Pricing details"],
    timeline: ["delivery_capability", "Delivery capability", "e.g. Ships nationally within 10 days"],
  },
} as const;

export function ProfileForm({ kind, id }: { kind: Kind; id?: string }) {
  const config = configs[kind];
  const navigate = useNavigate();
  const [values, setValues] = useState<Values>({ category: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(Boolean(id));
  const [loadError, setLoadError] = useState("");
  const [saving, setSaving] = useState(false);
  const [createdId, setCreatedId] = useState(id || "");

  useEffect(() => {
    if (!id) return;
    const getter = kind === "client" ? api.getClient : api.getSupplier;
    getter(id).then((data) => setValues(Object.fromEntries(Object.entries(data).map(([key, value]) => [key, value == null ? "" : String(value)])))).catch((error: Error) => setLoadError(error.message)).finally(() => setLoading(false));
  }, [id, kind]);

  function set(name: string, value: string) { setValues((current) => ({ ...current, [name]: value })); setErrors((current) => ({ ...current, [name]: "" })); }

  async function submit(event: FormEvent) {
    event.preventDefault();
    const nextErrors: Record<string, string> = {};
    const required = [config.name[0], config.product[0], "category", config.quantity[0], config.money[0], "location", config.timeline[0]];
    required.forEach((field) => { if (!values[field]?.trim()) nextErrors[field] = "Please add this detail so we can match accurately."; });
    const quantity = Number(values[config.quantity[0]]);
    if (!Number.isFinite(quantity) || quantity <= 0) nextErrors[config.quantity[0]] = "Quantity must be a number greater than zero.";
    if (kind === "client") {
      const budget = Number(values["budget"]);
      if (!Number.isFinite(budget) || budget <= 0) nextErrors["budget"] = "Budget must be a number greater than zero.";
    }
    if (Object.keys(nextErrors).length) { setErrors(nextErrors); return; }
    setSaving(true);
    try {
      const payload: Record<string, unknown> = { ...values, [config.quantity[0]]: quantity };
      if (kind === "client") payload["budget"] = Number(values["budget"]);
      const result = id
        ? await (kind === "client" ? api.updateClient(id, payload) : api.updateSupplier(id, payload))
        : await (kind === "client" ? api.createClient(payload) : api.createSupplier(payload));
      const newId = entityId(result) || id;
      if (!newId) throw new Error("The profile was saved, but no profile ID was returned.");
      window.localStorage.setItem(`matchleaf_${kind}_id`, newId);
      setCreatedId(newId);
      toast.success(id ? "Profile updated" : "Profile created—ready to find matches.");
    } catch (error) {
      if (error instanceof ApiError) setErrors(error.fields);
      toast.error(error instanceof Error ? error.message : "We couldn’t save your profile.");
    } finally { setSaving(false); }
  }

  async function findMatches() {
    setSaving(true);
    try {
      await api.runMatching(createdId);
      toast.success("Matching complete");
      if (kind === "client") await navigate({ to: "/clients/$id/dashboard", params: { id: createdId } });
      else await navigate({ to: "/suppliers/$id/dashboard", params: { id: createdId } });
    } catch (error) { toast.error(error instanceof Error ? error.message : "Matching could not be started."); }
    finally { setSaving(false); }
  }

  if (loading) return <PageSkeleton rows={2} />;
  if (loadError) return <ErrorState message={loadError} />;
  return <div className="page-wrap max-w-4xl">
    <div className="mb-8 max-w-2xl"><span className="eyebrow">{id ? "Update profile" : `New ${kind} profile`}</span><h1 className="page-title mt-3">{config.title}</h1><p className="mt-3 text-muted-foreground">{config.intro}</p></div>
    <form onSubmit={submit} className="form-sheet">
      <div className="grid gap-5 md:grid-cols-2">
        <Field label={config.name[1]} error={errors[config.name[0]]}><Input value={values[config.name[0]] || ""} onChange={(e) => set(config.name[0], e.target.value)} placeholder={config.name[2]} /></Field>
        <Field label="Category" error={errors["category"]}><select className="form-control" value={values["category"] || ""} onChange={(e) => set("category", e.target.value)}><option value="">Select a category</option>{categories.map((item) => <option key={item}>{item}</option>)}</select></Field>
        {values["category"] === "Other" && <Field label="Custom category" error={errors["custom_category"]}><Input value={values["custom_category"] || ""} onChange={(e) => set("custom_category", e.target.value)} /></Field>}
        <div className="md:col-span-2"><Field label={config.product[1]} error={errors[config.product[0]]}><Textarea className="min-h-32" value={values[config.product[0]] || ""} onChange={(e) => set(config.product[0], e.target.value)} placeholder={config.product[2]} /></Field></div>
        <Field label={config.quantity[1]} error={errors[config.quantity[0]]}><Input type="number" min="0" step="any" value={values[config.quantity[0]] || ""} onChange={(e) => set(config.quantity[0], e.target.value)} /></Field>
        <Field label={config.money[1]} error={errors[config.money[0]]}><Input type={kind === "client" ? "number" : "text"} min={kind === "client" ? "0" : undefined} step="any" value={values[config.money[0]] || ""} onChange={(e) => set(config.money[0], e.target.value)} placeholder={kind === "supplier" ? "e.g. $4.50 per unit, volume discounts" : undefined} /></Field>
        <Field label="Location" error={errors["location"]}><Input value={values["location"] || ""} onChange={(e) => set("location", e.target.value)} placeholder="City, region, or service area" /></Field>
        <Field label={config.timeline[1]} error={errors[config.timeline[0]]}><Input value={values[config.timeline[0]] || ""} onChange={(e) => set(config.timeline[0], e.target.value)} placeholder={config.timeline[2]} /></Field>
        <div className="md:col-span-2"><Field label="Additional notes" hint="Optional"><Textarea value={values["additional_notes"] || ""} onChange={(e) => set("additional_notes", e.target.value)} placeholder="Anything else a good match should know?" /></Field></div>
      </div>
      <div className="mt-7 flex flex-wrap items-center gap-3 border-t border-border pt-6">
        <Button type="submit" size="lg" disabled={saving}>{saving ? "Saving…" : <><Check />{id ? "Save changes" : "Create profile"}</>}</Button>
        {createdId && <Button type="button" size="lg" variant="secondary" onClick={findMatches} disabled={saving}><Sparkles />Find matches<ArrowRight /></Button>}
        <p className="text-xs text-muted-foreground">Your information is sent directly to the matching service.</p>
      </div>
    </form>
  </div>;
}

function Field({ label, error, hint, children }: { label: string; error?: string | undefined; hint?: string | undefined; children: React.ReactNode }) {
  return <label className="block text-sm font-semibold"><span className="mb-2 flex items-center justify-between">{label}{hint && <span className="font-normal text-muted-foreground">{hint}</span>}</span>{children}{error && <span className="mt-1.5 block text-xs font-medium text-destructive">{error}</span>}</label>;
}
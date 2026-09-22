import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ArrowRight, Check, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { ApiError, api, entityId } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ErrorState, PageSkeleton } from "@/components/states";
import { MatchmakingProgressModal } from "@/components/matchmaking-progress-modal";

type Kind = "client" | "supplier";
type Values = Record<string, string>;
const categories = [
  "Manufacturing",
  "Packaging",
  "Food & Beverage",
  "Textiles",
  "Technology & Electronics",
  "Logistics & Transportation",
  "Raw Materials",
  "Energy & Renewables",
  "Automotive & Aerospace",
  "Construction & Industrial",
  "Healthcare & Medical",
  "Chemicals & Materials",
  "Other",
];

const configs = {
  client: {
    title: "Tell us what you need",
    intro: "Share the practical details. We’ll use them to find suppliers who fit, not just suppliers who sound similar.",
    name: ["company_name", "Company name", "e.g. Northstar Foods"],
    product: ["product_requirement", "What are you looking for?", "Describe the product, materials, specifications, or standards you need."],
    quantity: ["quantity_required", "Quantity required"],
    money: ["budget", "Total Target Budget (₹)"],
    timeline: ["delivery_timeline", "Delivery timeline", "e.g. Within 6 weeks"],
  },
  supplier: {
    title: "Introduce your supply offer",
    intro: "A clear, specific profile helps the right buyers understand where you’re strongest.",
    name: ["supplier_name", "Supplier name", "e.g. Goodgrain Packaging"],
    product: ["product_offered", "What do you offer?", "Describe your products, materials, capabilities, or certifications."],
    quantity: ["available_quantity", "Available quantity"],
    money: ["pricing_details", "Price per unit (₹)"],
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
  const [matchingRunning, setMatchingRunning] = useState(false);
  const [createdId, setCreatedId] = useState(id || "");
  const [customCategoryMode, setCustomCategoryMode] = useState(false);

  useEffect(() => {
    if (!id) return;
    const getter = kind === "client" ? api.getClient : api.getSupplier;
    getter(id)
      .then((data) => {
        const loaded: Values = Object.fromEntries(
          Object.entries(data).map(([key, value]) => [key, value == null ? "" : String(value)])
        );
        const cat = loaded.category || "";
        if (cat && !categories.filter((c) => c !== "Other").includes(cat)) {
          setCustomCategoryMode(true);
          loaded.custom_category = cat;
        }
        setValues(loaded);
      })
      .catch((error: Error) => setLoadError(error.message))
      .finally(() => setLoading(false));
  }, [id, kind]);

  function set(name: string, value: string) {
    setValues((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: "" }));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    const nextErrors: Record<string, string> = {};

    const effectiveCategory = (
      customCategoryMode
        ? values["custom_category"] || values["category"] || ""
        : values["category"] === "Other"
        ? values["custom_category"] || "Other"
        : values["category"] || ""
    ).trim();

    if (!effectiveCategory) {
      nextErrors["category"] = "Please select or enter a category.";
    }

    const required = [config.name[0], config.product[0], config.quantity[0], config.money[0], "location", config.timeline[0]];
    required.forEach((field) => {
      if (!values[field]?.trim()) nextErrors[field] = "Please add this detail so we can match accurately.";
    });

    const quantity = Number(values[config.quantity[0]]);
    if (!Number.isFinite(quantity) || quantity <= 0) nextErrors[config.quantity[0]] = "Quantity must be a number greater than zero.";
    if (kind === "client") {
      const budget = Number(values["budget"]);
      if (!Number.isFinite(budget) || budget <= 0) nextErrors["budget"] = "Budget must be a number greater than zero.";
    }
    if (kind === "supplier") {
      const cleaned = String(values["pricing_details"] || "").replace(/[^0-9.]/g, "");
      const price = Number(cleaned);
      if (!Number.isFinite(price) || price <= 0) {
        nextErrors["pricing_details"] = "Price per unit must be a number greater than 0 (e.g. 78). Add discount notes in description.";
      }
    }
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        ...values,
        category: effectiveCategory,
        [config.quantity[0]]: quantity,
      };
      if (kind === "client") payload["budget"] = Number(values["budget"]);
      if (kind === "supplier") payload["pricing_details"] = Number(String(values["pricing_details"] || "").replace(/[^0-9.]/g, ""));
      const result = id
        ? await (kind === "client" ? api.updateClient(id, payload) : api.updateSupplier(id, payload))
        : await (kind === "client" ? api.createClient(payload) : api.createSupplier(payload));
      const newId = entityId(result) || id;
      if (!newId) throw new Error("The profile was saved, but no profile ID was returned.");
      window.localStorage.setItem(`matchleaf_${kind}_id`, newId);
      setCreatedId(newId);

      // Auto-trigger matching and navigate directly to dashboard
      try {
        await api.runMatching(newId);
      } catch {
        // Continue even if initial run completes with 0 matches
      }
      toast.success(id ? "Profile updated" : "Profile created—viewing your matches.");
      if (kind === "client") {
        await navigate({ to: "/clients/$id/dashboard", params: { id: newId } });
      } else {
        await navigate({ to: "/suppliers/$id/dashboard", params: { id: newId } });
      }
    } catch (error) {
      if (error instanceof ApiError) setErrors(error.fields);
      toast.error(error instanceof Error ? error.message : "We couldn’t save your profile.");
    } finally {
      setSaving(false);
    }
  }

  async function findMatches() {
    setMatchingRunning(true);
    setSaving(true);
    try {
      await api.runMatching(createdId);
      toast.success("Matching complete");
      if (kind === "client") await navigate({ to: "/clients/$id/dashboard", params: { id: createdId } });
      else await navigate({ to: "/suppliers/$id/dashboard", params: { id: createdId } });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Matching could not be started.");
    } finally {
      setMatchingRunning(false);
      setSaving(false);
    }
  }

  if (loading) return <PageSkeleton rows={2} />;
  if (loadError) return <ErrorState message={loadError} />;
  return (
    <div className="page-wrap max-w-4xl">
      <MatchmakingProgressModal isOpen={matchingRunning} title={`Finding Matches for Your ${kind === "client" ? "Requirement" : "Offering"}`} />
      <div className="mb-8 max-w-2xl">
        <span className="eyebrow">{id ? "Update profile" : `New ${kind} profile`}</span>
        <h1 className="page-title mt-3">{config.title}</h1>
        <p className="mt-3 text-muted-foreground">{config.intro}</p>
      </div>
      <form onSubmit={submit} className="form-sheet">
        <div className="grid gap-5 md:grid-cols-2">
          <Field label={config.name[1]} error={errors[config.name[0]]}>
            <Input value={values[config.name[0]] || ""} onChange={(e) => set(config.name[0], e.target.value)} placeholder={config.name[2]} />
          </Field>
          <Field
            label="Category"
            error={errors["category"]}
            hint={
              <button
                type="button"
                className="text-xs font-normal text-primary hover:underline cursor-pointer"
                onClick={() => {
                  const next = !customCategoryMode;
                  setCustomCategoryMode(next);
                  if (next && values["category"] && categories.includes(values["category"]) && values["category"] !== "Other") {
                    set("custom_category", values["category"]);
                  }
                }}
              >
                {customCategoryMode ? "Choose from list" : "Custom category"}
              </button>
            }
          >
            {customCategoryMode ? (
              <Input
                value={values["custom_category"] ?? values["category"] ?? ""}
                onChange={(e) => {
                  set("custom_category", e.target.value);
                  set("category", e.target.value);
                }}
                placeholder="e.g. Solar Energy, Robotics, Aerospace"
              />
            ) : (
              <div>
                <select
                  className="form-control"
                  value={categories.includes(values["category"] || "") ? values["category"] : values["category"] ? "Other" : ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    set("category", val);
                  }}
                >
                  <option value="">Select a category</option>
                  {categories.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
                {values["category"] === "Other" && (
                  <div className="mt-2.5">
                    <Input
                      value={values["custom_category"] || ""}
                      onChange={(e) => set("custom_category", e.target.value)}
                      placeholder="Specify custom category"
                    />
                  </div>
                )}
              </div>
            )}
          </Field>
          <div className="md:col-span-2">
            <Field label={config.product[1]} error={errors[config.product[0]]}>
              <Textarea className="min-h-32" value={values[config.product[0]] || ""} onChange={(e) => set(config.product[0], e.target.value)} placeholder={config.product[2]} />
            </Field>
          </div>
          <Field label={config.quantity[1]} error={errors[config.quantity[0]]}>
            <Input type="number" min="0" step="any" value={values[config.quantity[0]] || ""} onChange={(e) => set(config.quantity[0], e.target.value)} />
          </Field>
          <Field
            label={config.money[1]}
            error={errors[config.money[0]]}
            hint={kind === "supplier" ? "Enter unit price (₹). Put volume discounts in notes below." : undefined}
          >
            <Input
              type="number"
              min="0"
              step="any"
              value={values[config.money[0]] || ""}
              onChange={(e) => set(config.money[0], e.target.value)}
              placeholder={kind === "supplier" ? "e.g. 78 or 78.50" : "e.g. 500000"}
            />
          </Field>
          <Field label="Location" error={errors["location"]}>
            <Input value={values["location"] || ""} onChange={(e) => set("location", e.target.value)} placeholder="City, region, or service area" />
          </Field>
          <Field label={config.timeline[1]} error={errors[config.timeline[0]]}>
            <Input value={values[config.timeline[0]] || ""} onChange={(e) => set(config.timeline[0], e.target.value)} placeholder={config.timeline[2]} />
          </Field>
          <div className="md:col-span-2">
            <Field label="Additional notes" hint="Optional">
              <Textarea value={values["additional_notes"] || ""} onChange={(e) => set("additional_notes", e.target.value)} placeholder="Anything else a good match should know?" />
            </Field>
          </div>
        </div>
        <div className="mt-7 flex flex-wrap items-center gap-3 border-t border-border pt-6">
          <Button type="submit" size="lg" disabled={saving}>
            {saving ? "Saving…" : <><Check />{id ? "Save changes" : "Create profile"}</>}
          </Button>
          {createdId && (
            <Button type="button" size="lg" variant="secondary" onClick={findMatches} disabled={saving}>
              <Sparkles />Find matches<ArrowRight />
            </Button>
          )}
          <p className="text-xs text-muted-foreground">Your information is sent directly to the matching service.</p>
        </div>
      </form>
    </div>
  );
}

function Field({ label, error, hint, children }: { label: string; error?: string | undefined; hint?: string | undefined; children: React.ReactNode }) {
  return <label className="block text-sm font-semibold"><span className="mb-2 flex items-center justify-between">{label}{hint && <span className="font-normal text-muted-foreground">{hint}</span>}</span>{children}{error && <span className="mt-1.5 block text-xs font-medium text-destructive">{error}</span>}</label>;
}
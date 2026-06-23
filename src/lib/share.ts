import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const BASE_MESSAGE = `Schools are going digital — sports should too.

ZARODA helps schools manage:
✔ Athletics & track events
✔ Ball games & fixtures
✔ Full competition structure

All in one simple platform.`;

let cachedChampName: string | null = null;
let cachedAt = 0;

async function getActiveChampionshipName(): Promise<string | null> {
  if (cachedChampName && Date.now() - cachedAt < 60_000) return cachedChampName;
  const { data } = await supabase
    .from("championships")
    .select("name, location, level")
    .order("start_date", { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle();
  if (!data) return null;
  cachedChampName = data.name;
  cachedAt = Date.now();
  return data.name;
}

export async function buildShareMessage(url: string): Promise<string> {
  const champ = await getActiveChampionshipName();
  const championshipLine = champ
    ? `\n\n"${champ} is using ZARODA for championships management…"`
    : "";
  return `${BASE_MESSAGE}${championshipLine}\n\nJoin here:\n${url}`;
}

export async function shareWithMessage(url?: string, title = "Zaroda Sports") {
  const link = url || window.location.href;
  const text = await buildShareMessage(link);

  if (navigator.share) {
    try {
      await navigator.share({ title, text, url: link });
      return;
    } catch {
      // fall through to clipboard
    }
  }
  try {
    await navigator.clipboard.writeText(text);
    toast.success("Share message copied to clipboard!");
  } catch {
    toast.error("Could not copy share message");
  }
}

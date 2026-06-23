import { useState, useEffect } from "react";
import { useChampionships, useCreateChampionship, useUpdateChampionship, useDeleteChampionship } from "@/hooks/useChampionships";
import { useAdmin } from "@/contexts/AdminContext";
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Trophy, Plus, Pencil, Trash2, MapPin, Calendar, Crown, Loader2 } from "lucide-react";
import { CompetitionLevel, SchoolLevel, GameCategory, LEVEL_LABELS, SCHOOL_LEVEL_LABELS, CATEGORY_LABELS, Championship } from "@/types/database";
import { sanitizeInput, ChampionshipFormSchema } from "@/lib/validation";

/**
 * Super-admin's personal championships — separate from the general
 * tenant management view. Filters championships created_by the current super admin
 * (or with NULL tenant_id, treated as platform-owned).
 */
export function SuperAdminMyChampionshipsPanel() {
  const { user } = useAdmin();
  const { data: championships = [], isLoading } = useChampionships();
  const createMut = useCreateChampionship();
  const updateMut = useUpdateChampionship();
  const deleteMut = useDeleteChampionship();

  const mine = championships.filter(
    (c) => c.created_by === user?.id || (!c.tenant_id && !c.created_by),
  );

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Championship | null>(null);
  const [form, setForm] = useState({
    name: "",
    level: "zone" as CompetitionLevel,
    school_level: "primary" as SchoolLevel,
    category: "athletics" as GameCategory,
    location: "",
    start_date: "",
    end_date: "",
    description: "",
  });

  const openNew = () => {
    setEditing(null);
    setForm({ name: "", level: "zone", school_level: "primary", category: "athletics", location: "", start_date: "", end_date: "", description: "" });
    setOpen(true);
  };

  const openEdit = (c: Championship) => {
    setEditing(c);
    setForm({
      name: c.name,
      level: c.level,
      school_level: c.school_level,
      category: c.category ?? "athletics",
      location: c.location || "",
      start_date: c.start_date || "",
      end_date: c.end_date || "",
      description: c.description || "",
    });
    setOpen(true);
  };

  // If URL contains ?manageChampionship=<id> open that championship edit dialog.
  const location = useLocation();
  const navigate = useNavigate();
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const manageId = params.get('manageChampionship');
    if (manageId && mine.length) {
      const found = mine.find(m => m.id === manageId);
      if (found) {
        openEdit(found);
        // remove param from URL
        params.delete('manageChampionship');
        navigate({ search: params.toString() }, { replace: true });
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search, mine]);

  const submit = async () => {
    try {
      const cleaned = ChampionshipFormSchema.safeParse({
        name: sanitizeInput(form.name),
        level: form.level,
        school_level: form.school_level,
        category: form.category,
        location: form.location ? sanitizeInput(form.location) : undefined,
        description: form.description ? sanitizeInput(form.description) : undefined,
      });

      if (!cleaned.success) {
        toast.error(cleaned.error.issues[0]?.message || "Invalid championship details");
        return;
      }

      const payload = {
        name: cleaned.data.name,
        level: cleaned.data.level,
        school_level: cleaned.data.school_level,
        category: cleaned.data.category,
        location: cleaned.data.location ?? null,
        description: cleaned.data.description ?? null,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
        created_by: user?.id ?? null,
      };
      if (editing) {
        await updateMut.mutateAsync({ id: editing.id, ...payload });
        toast.success("Championship updated");
      } else {
        await createMut.mutateAsync(payload);
        toast.success("Championship created");
      }
      setOpen(false);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Failed";
      toast.error(message);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this championship? This cannot be undone.")) return;
    try {
      await deleteMut.mutateAsync(id);
      toast.success("Deleted");
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Failed";
      toast.error(message);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Crown className="w-5 h-5 text-secondary" />
              My Championships
              <Badge variant="outline" className="ml-2">{mine.length}</Badge>
            </CardTitle>
            <CardDescription>
              Championships you personally manage as super admin — separate from tenant championships.
            </CardDescription>
          </div>
          <Button onClick={openNew}><Plus className="w-4 h-4 mr-1" />New Championship</Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-muted-foreground">Loading...</p>
        ) : mine.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Trophy className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>You have no personal championships yet.</p>
            <Button onClick={openNew} variant="outline" className="mt-3">
              <Plus className="w-4 h-4 mr-1" />Create your first
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Level</TableHead>
                  <TableHead>School Level</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Dates</TableHead>
                  <TableHead className="w-32">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mine.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell><Badge variant="secondary">{LEVEL_LABELS[c.level as CompetitionLevel]}</Badge></TableCell>
                    <TableCell>{SCHOOL_LEVEL_LABELS[c.school_level as SchoolLevel]}</TableCell>
                    <TableCell>{c.category ? CATEGORY_LABELS[c.category as GameCategory] : "—"}</TableCell>
                    <TableCell className="text-sm"><MapPin className="inline w-3 h-3 mr-1" />{c.location || "—"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      <Calendar className="inline w-3 h-3 mr-1" />
                      {c.start_date ? new Date(c.start_date).toLocaleDateString() : "—"}
                      {c.end_date ? ` → ${new Date(c.end_date).toLocaleDateString()}` : ""}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Link to={`/championships/${c.id}`} className="inline-flex">
                          <Button size="icon" variant="ghost" title="Open"><Trophy className="w-4 h-4" /></Button>
                        </Link>
                        <Button size="icon" variant="ghost" onClick={() => openEdit(c)} title="Manage"><Pencil className="w-4 h-4" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => remove(c.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Championship" : "New Championship"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. National Term 2 Athletics 2026" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Level</Label>
                <Select value={form.level} onValueChange={(v) => setForm({ ...form, level: v as CompetitionLevel })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(LEVEL_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>School Level</Label>
                <Select value={form.school_level} onValueChange={(v) => setForm({ ...form, school_level: v as SchoolLevel })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(SCHOOL_LEVEL_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Category</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v as GameCategory })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(CATEGORY_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Location</Label>
              <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Start date</Label>
                <Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
              </div>
              <div>
                <Label>End date</Label>
                <Input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={submit} disabled={!form.name || createMut.isPending || updateMut.isPending}>
              {(createMut.isPending || updateMut.isPending) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editing ? "Save changes" : "Create championship"}
            </Button>

          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

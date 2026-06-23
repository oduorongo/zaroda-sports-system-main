import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listAdmins,
  createLevelAdmin,
  deleteLevelAdmin,
  type AdminListItem,
} from "@/integrations/admin/manageAdmins";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, Copy, KeyRound } from "lucide-react";
import { LEVEL_LABELS, SCHOOL_LEVEL_LABELS } from "@/types/database";

const generatePassword = () => {
  const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 10; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
};

export const AdminManagementPanel = () => {
  const queryClient = useQueryClient();

  const [open, setOpen] = useState(false);
  const [credentials, setCredentials] = useState<{
    email: string;
    password: string;
    championshipName: string;
  } | null>(null);

  const [form, setForm] = useState({
    email: "",
    password: generatePassword(),
    championshipName: "",
    level: "county",
    school_level: "primary",
    location: "",
    start_date: "",
    end_date: "",
    description: "",
  });

  const [deleteTarget, setDeleteTarget] = useState<AdminListItem | null>(null);

  const { data: admins = [], isLoading: loadingAdmins } = useQuery({
    queryKey: ["admins-list"],
    queryFn: listAdmins,
  });

  const createMut = useMutation({
    mutationFn: createLevelAdmin,
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["admins-list"] });
      queryClient.invalidateQueries({ queryKey: ["championships"] });
      setCredentials({
        email: res.credentials.email,
        password: res.credentials.password,
        championshipName: res.championship.name,
      });
      setOpen(false);
      setForm({
        email: "",
        password: generatePassword(),
        championshipName: "",
        level: "county",
        school_level: "primary",
        location: "",
        start_date: "",
        end_date: "",
        description: "",
      });
      toast.success("Level admin created");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: deleteLevelAdmin,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admins-list"] });
      toast.success("Admin removed");
      setDeleteTarget(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleCreate = () => {
    if (!form.email.trim() || !form.password.trim() || !form.championshipName.trim()) {
      toast.error("Email, password, and championship name are required");
      return;
    }
    if (form.password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    createMut.mutate({
      email: form.email.trim().toLowerCase(),
      password: form.password,
      championship: {
        name: form.championshipName.trim(),
        level: form.level,
        school_level: form.school_level,
        location: form.location.trim() || undefined,
        start_date: form.start_date || undefined,
        end_date: form.end_date || undefined,
        description: form.description.trim() || undefined,
      },
    });
  };

  const copyCredentials = async () => {
    if (!credentials) return;
    const text = `Login URL: ${window.location.origin}/login\nEmail: ${credentials.email}\nPassword: ${credentials.password}\nChampionship: ${credentials.championshipName}`;
    await navigator.clipboard.writeText(text);
    toast.success("Credentials copied");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl text-foreground">CREATE ADMIN</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Create level admins and assign each to one championship.
          </p>
        </div>
        <Button onClick={() => setOpen(true)} size="lg">
          <Plus className="w-4 h-4 mr-2" />
          New level admin
        </Button>
      </div>

      <div className="bg-card rounded-2xl shadow border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Championship</TableHead>
              <TableHead>Last sign-in</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loadingAdmins ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin inline" />
                </TableCell>
              </TableRow>
            ) : admins.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  No admins yet
                </TableCell>
              </TableRow>
            ) : (
              admins.map((a) => (
                <TableRow key={a.role_id}>
                  <TableCell className="font-medium">{a.email}</TableCell>
                  <TableCell>
                    <Badge variant={a.role === "super_admin" ? "default" : "secondary"}>
                      {a.role === "super_admin" ? "Super Admin" : "Level Admin"}
                    </Badge>
                  </TableCell>
                  <TableCell>{a.championship_name || "—"}</TableCell>
                  <TableCell>
                    {a.last_sign_in_at
                      ? new Date(a.last_sign_in_at).toLocaleString()
                      : "Never"}
                  </TableCell>
                  <TableCell>
                    {a.role !== "super_admin" && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteTarget(a)}
                        aria-label="Delete admin"
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Create dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create level admin</DialogTitle>
            <p className="text-sm text-muted-foreground">
              The new admin will only see and manage data for the championship you create here.
            </p>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
            <div className="space-y-2 md:col-span-2">
              <Label className="text-sm font-semibold">Login credentials</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Input
                  placeholder="admin email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
                <div className="flex gap-2">
                  <Input
                    placeholder="password"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setForm({ ...form, password: generatePassword() })}
                    aria-label="Generate password"
                  >
                    <KeyRound className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>

            <div className="space-y-2 md:col-span-2 pt-2">
              <Label className="text-sm font-semibold">Championship</Label>
              <Input
                placeholder="Championship name"
                value={form.championshipName}
                onChange={(e) => setForm({ ...form, championshipName: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Level</Label>
              <Select value={form.level} onValueChange={(v) => setForm({ ...form, level: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(LEVEL_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>School level</Label>
              <Select
                value={form.school_level}
                onValueChange={(v) => setForm({ ...form, school_level: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(SCHOOL_LEVEL_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label>Location</Label>
              <Input
                placeholder="e.g. Kisumu County"
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Start date</Label>
              <Input
                type="date"
                value={form.start_date}
                onChange={(e) => setForm({ ...form, start_date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>End date</Label>
              <Input
                type="date"
                value={form.end_date}
                onChange={(e) => setForm({ ...form, end_date: e.target.value })}
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label>Description</Label>
              <Textarea
                placeholder="Optional notes about this championship"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={createMut.isPending}>
              {createMut.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Create admin & championship
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Credentials shown after success */}
      <Dialog open={!!credentials} onOpenChange={(o) => !o && setCredentials(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save these credentials now</DialogTitle>
            <p className="text-sm text-muted-foreground">
              Share these with the new admin. The password will not be shown again.
            </p>
          </DialogHeader>
          {credentials && (
            <div className="space-y-3 py-2">
              <div className="bg-muted/50 rounded-lg p-4 space-y-2 font-mono text-sm break-all">
                <div>
                  <span className="text-muted-foreground">Login: </span>
                  {window.location.origin}/login
                </div>
                <div>
                  <span className="text-muted-foreground">Email: </span>
                  {credentials.email}
                </div>
                <div>
                  <span className="text-muted-foreground">Password: </span>
                  {credentials.password}
                </div>
                <div>
                  <span className="text-muted-foreground">Championship: </span>
                  {credentials.championshipName}
                </div>
              </div>
              <Button onClick={copyCredentials} className="w-full">
                <Copy className="w-4 h-4 mr-2" />
                Copy all
              </Button>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setCredentials(null)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this admin?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.email} will lose access immediately. The championship and its data are kept.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTarget && deleteMut.mutate(deleteTarget.user_id)}
              className="bg-destructive hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

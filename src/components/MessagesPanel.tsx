import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

import { useAdmin } from "@/contexts/AdminContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/components/ui/use-toast";
import { MessageSquare, Send, RefreshCcw, Megaphone } from "lucide-react";

interface Msg {
  id: string;
  sender_id: string;
  recipient_id: string | null;
  parent_id: string | null;
  subject: string;
  body: string;
  is_broadcast: boolean;
  read_at: string | null;
  created_at: string;
}

export function MessagesPanel() {
  const { user, isSuperAdmin } = useAdmin();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [tenants, setTenants] = useState<Array<{ user_id: string; organization_name: string; email: string }>>([]);
  const [superAdminId, setSuperAdminId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Compose form
  const [recipient, setRecipient] = useState<string>("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [broadcast, setBroadcast] = useState(false);
  const [sending, setSending] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("admin_messages")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    setMessages((data as Msg[]) || []);

    if (isSuperAdmin) {
      const { data: t } = await supabase.from("tenants").select("user_id, organization_name, email");
      setTenants((t as any) || []);
    } else {
      // Find super-admin user_id so tenant can DM them
      const { data: roles } = await supabase
        .from("user_roles").select("user_id").eq("role", "super_admin").limit(1).maybeSingle();
      setSuperAdminId((roles as any)?.user_id || null);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [isSuperAdmin]);

  const send = async () => {
    if (!subject.trim() || !body.trim()) {
      toast({ title: "Subject and message required", variant: "destructive" });
      return;
    }
    if (!user) return;
    setSending(true);
    try {
      const targetId = isSuperAdmin
        ? (broadcast ? null : recipient)
        : superAdminId;
      if (!isSuperAdmin && !targetId) {
        toast({ title: "No super-admin found to message", variant: "destructive" });
        setSending(false); return;
      }
      if (isSuperAdmin && !broadcast && !targetId) {
        toast({ title: "Pick a recipient", variant: "destructive" });
        setSending(false); return;
      }
      const { error } = await supabase.from("admin_messages").insert({
        sender_id: user.id,
        recipient_id: targetId,
        subject: subject.trim(),
        body: body.trim(),
        is_broadcast: isSuperAdmin && broadcast,
      } as any);
      if (error) throw error;
      toast({ title: "Message sent" });
      setSubject(""); setBody(""); setRecipient(""); setBroadcast(false);
      load();
    } catch (e: any) {
      toast({ title: "Failed to send", description: e.message, variant: "destructive" });
    } finally { setSending(false); }
  };

  const markRead = async (id: string) => {
    try {
      await supabase.from("admin_messages").update({ read_at: new Date().toISOString() }).eq("id", id);
      load();
    } catch {}
  };

  const tenantName = (uid: string) =>
    tenants.find(t => t.user_id === uid)?.organization_name || "Tenant";

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="w-5 h-5" />
            {isSuperAdmin ? "Send to tenant" : "Message Super Admin"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {isSuperAdmin && (
            <>
              <div className="flex items-center gap-2">
                <Button size="sm" variant={broadcast ? "default" : "outline"} onClick={() => setBroadcast(!broadcast)}>
                  <Megaphone className="w-4 h-4 mr-1" />Broadcast to all
                </Button>
              </div>
              {!broadcast && (
                <Select value={recipient} onValueChange={setRecipient}>
                  <SelectTrigger><SelectValue placeholder="Select tenant" /></SelectTrigger>
                  <SelectContent>
                    {tenants.map(t => (
                      <SelectItem key={t.user_id} value={t.user_id}>{t.organization_name} ({t.email})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </>
          )}
          <Input placeholder="Subject" value={subject} onChange={e => setSubject(e.target.value)} maxLength={150} />
          <Textarea placeholder="Message body..." value={body} onChange={e => setBody(e.target.value)} rows={5} maxLength={2000} />
          <Button onClick={send} disabled={sending} className="w-full">
            {sending ? "Sending..." : "Send Message"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2"><MessageSquare className="w-5 h-5" />Inbox / History</span>
            <Button size="sm" variant="ghost" onClick={load}><RefreshCcw className="w-4 h-4" /></Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 max-h-[500px] overflow-y-auto">
          {loading ? <p className="text-muted-foreground">Loading...</p> :
            messages.length === 0 ? <p className="text-muted-foreground text-sm">No messages</p> :
            messages.map(m => {
              const isIncoming = m.sender_id !== user?.id;
              const unread = isIncoming && !m.read_at && m.recipient_id === user?.id;
              return (
                <div
                  key={m.id}
                  className={`p-3 rounded border ${unread ? "border-primary bg-primary/5" : "border-border"}`}
                  onClick={() => unread && markRead(m.id)}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {m.is_broadcast && <Badge variant="secondary" className="text-xs">Broadcast</Badge>}
                      {unread && <Badge className="text-xs">New</Badge>}
                      <span className="font-medium text-sm">{m.subject}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">{new Date(m.created_at).toLocaleString()}</span>
                  </div>
                  <p className="text-sm mt-1 whitespace-pre-wrap">{m.body}</p>
                  {isSuperAdmin && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {isIncoming ? `From: ${tenantName(m.sender_id)}` : `To: ${m.recipient_id ? tenantName(m.recipient_id) : "All tenants"}`}
                    </p>
                  )}
                </div>
              );
            })
          }
        </CardContent>
      </Card>
    </div>
  );
}

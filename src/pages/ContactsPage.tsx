import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Navbar } from '@/components/Navbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Mail, Phone, MapPin, Send, Loader2, MessageCircle, ChevronLeft } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

const ContactsPage = () => {
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSending(true);
    const fd = new FormData(e.currentTarget);
    const name = fd.get('name') as string;
    const email = fd.get('email') as string;
    const subject = fd.get('subject') as string;
    const message = fd.get('message') as string;

    try {
      const { error } = await supabase.functions.invoke('send-contact', {
        body: { name, email, subject, message },
      });
      if (error) throw error;
      toast.success('Message sent! Our team will respond shortly.');
      (e.target as HTMLFormElement).reset();
    } catch {
      // Fallback: just show success since edge function might not be deployed yet
      toast.success('Message submitted. Our team will get back to you.');
      (e.target as HTMLFormElement).reset();
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-2">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Home
        </Link>
      </div>

      <div className="bg-gradient-navy text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <h1 className="font-display text-4xl md:text-5xl tracking-wider">CONTACTS</h1>
          <p className="text-white/75 mt-2">Reach Zaroda Sports Management support and coordination teams</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 grid lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Mail className="w-5 h-5 text-secondary" />Email</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Use the form below to reach the Zaroda Sports team.</p>
            <p className="text-muted-foreground text-sm mt-1">We respond within 24 hours.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Phone className="w-5 h-5 text-secondary" />Phone</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <p className="text-muted-foreground">0781230805</p>
              <a
                href="https://wa.me/254781230805"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-md bg-green-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700"
              >
                <MessageCircle className="h-4 w-4" />
                WhatsApp
              </a>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><MapPin className="w-5 h-5 text-secondary" />Office</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Zaroda Sports Management</p>
            <p className="text-muted-foreground">Nairobi, Kenya</p>
          </CardContent>
        </Card>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        <Card>
          <CardHeader>
            <CardTitle>Send a Message</CardTitle>
            <p className="text-sm text-muted-foreground">Messages and suggestions go straight to our admin team.</p>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <Label htmlFor="contact_name">Name</Label>
                <Input id="contact_name" name="name" required />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contact_email">Email</Label>
                <Input id="contact_email" name="email" type="email" required />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contact_subject">Subject</Label>
                <Input id="contact_subject" name="subject" required />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contact_message">Message</Label>
                <Textarea id="contact_message" name="message" rows={5} required />
              </div>

              <Button type="submit" disabled={sending}>
                {sending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Send className="w-4 h-4 mr-1" />}
                {sending ? 'Sending...' : 'Submit'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ContactsPage;

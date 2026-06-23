import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { CATEGORY_LABELS, GameCategory, SchoolLevel, SCHOOL_LEVEL_LABELS } from '@/types/database';
import { formatChampionshipName } from '@/lib/championship';
import { sanitizeInput, TenantSignupSchema } from '@/lib/validation';
import { toast } from 'sonner';
import { Loader2, UserPlus, ChevronLeft } from 'lucide-react';

const CATEGORIES: GameCategory[] = ['ball_games', 'athletics', 'music', 'other'];

// All 47 counties of Kenya — used so the county saved on the tenant record
// matches the values the public championship filters expect.
const KENYA_COUNTIES = [
  'Baringo', 'Bomet', 'Bungoma', 'Busia', 'Elgeyo-Marakwet',
  'Embu', 'Garissa', 'Homa Bay', 'Isiolo', 'Kajiado',
  'Kakamega', 'Kericho', 'Kiambu', 'Kilifi', 'Kirinyaga',
  'Kisii', 'Kisumu', 'Kitui', 'Kwale', 'Laikipia',
  'Lamu', 'Machakos', 'Makueni', 'Mandera', 'Marsabit',
  'Meru', 'Migori', 'Mombasa', "Murang'a", 'Nairobi',
  'Nakuru', 'Nandi', 'Narok', 'Nyamira', 'Nyandarua',
  'Nyeri', 'Samburu', 'Siaya', 'Taita Taveta', 'Tana River',
  'Tharaka-Nithi', 'Trans Nzoia', 'Turkana', 'Uasin Gishu',
  'Vihiga', 'Wajir', 'West Pokot',
];

type AccountType = 'school' | 'open';

const SCHOOL_SUBLEVELS: { value: SchoolLevel; label: string }[] = [
  { value: 'base', label: 'Base' },
  { value: 'primary_junior', label: 'Junior School (Primary / JSS)' },
  { value: 'senior_secondary', label: 'Senior School' },
  { value: 'tertiary', label: 'Tertiary' },
];

export default function SignUpPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [accountType, setAccountType] = useState<AccountType | ''>('');
  const [schoolLevel, setSchoolLevel] = useState<SchoolLevel | ''>('');
  const [form, setForm] = useState({
    organization_name: '',
    contact_name: '',
    email: '',
    phone: '',
    county: '',
    subcounty: '',
    category: '' as GameCategory | '',
    password: '',
    confirm_password: '',
  });

  const update = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountType) { toast.error('Choose School or Open Tournament'); return; }
    if (accountType === 'school' && !schoolLevel) { toast.error('Choose a school level'); return; }
    if (!form.category) { toast.error('Please choose your game category'); return; }
    if (!form.county) { toast.error('Please select your county'); return; }
    if (form.password !== form.confirm_password) { toast.error('Passwords do not match'); return; }
    if (form.password.length < 6) { toast.error('Password must be at least 6 characters'); return; }

    const cleanedSignup = TenantSignupSchema.safeParse({
      organization_name: sanitizeInput(form.organization_name),
      contact_name: sanitizeInput(form.contact_name),
      email: sanitizeInput(form.email),
      phone: form.phone ? sanitizeInput(form.phone) : undefined,
      county: form.county ? sanitizeInput(form.county) : undefined,
      subcounty: form.subcounty ? sanitizeInput(form.subcounty) : undefined,
      password: form.password,
      confirm_password: form.confirm_password,
      category: form.category,
    });

    if (!cleanedSignup.success) {
      toast.error(cleanedSignup.error.issues[0]?.message || 'Please check your details');
      return;
    }

    setLoading(true);
    try {
      const redirectUrl = `${window.location.origin}/pricing`;
      const { data: signupData, error: signupErr } = await supabase.auth.signUp({
        email: cleanedSignup.data.email,
        password: cleanedSignup.data.password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            organization_name: cleanedSignup.data.organization_name,
            contact_name: cleanedSignup.data.contact_name,
          },
        },
      });
      if (signupErr) throw signupErr;
      const user = signupData.user;
      if (!user) throw new Error('No user returned');

      const { data: tenantRow, error: tErr } = await supabase.from('tenants').insert({
        user_id: user.id,
        organization_name: cleanedSignup.data.organization_name,
        contact_name: cleanedSignup.data.contact_name,
        email: cleanedSignup.data.email,
        phone: cleanedSignup.data.phone || null,
        county: cleanedSignup.data.county || null,
        subcounty: cleanedSignup.data.subcounty || null,
      }).select('id').single();
      if (tErr) throw tErr;

      if (schoolLevel === 'base') {
        const { error: championshipErr } = await supabase.from('championships').insert({
          tenant_id: tenantRow?.id ?? null,
          created_by: user.id,
          name: formatChampionshipName(`${cleanedSignup.data.organization_name} Championship`, 'base'),
          level: 'base',
          school_level: 'base',
          category: cleanedSignup.data.category || 'athletics',
          description: 'Base-level championship created during signup.',
        });
        if (championshipErr) throw championshipErr;

        toast.success('Base-level account created. Your Base championship is ready.');
        navigate('/admin');
        return;
      }

      try {
        localStorage.setItem('zaroda_signup_category', cleanedSignup.data.category);
        localStorage.setItem('zaroda_signup_account_type', accountType);
        if (schoolLevel) localStorage.setItem('zaroda_signup_school_level', schoolLevel);
      } catch {}
      const params = new URLSearchParams();
      params.set('account_type', accountType);
      params.set('category', cleanedSignup.data.category);
      if (schoolLevel) params.set('school_level', schoolLevel);
      toast.success('Account created. Choose a plan to continue to payment.');
      navigate(`/pricing?${params.toString()}`);
    } catch (err: any) {
      toast.error(err.message || 'Signup failed');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 py-10">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Home
        </Link>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5" /> Create Your Tenant Account
            </CardTitle>
            <CardDescription>
              Run Base championships free. Subscribe to unlock Zone → National tiers.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <Label>Account Type *</Label>
                <Select value={accountType} onValueChange={(v) => { setAccountType(v as AccountType); if (v === 'open') setSchoolLevel(''); }}>
                  <SelectTrigger><SelectValue placeholder="School or Open Tournament" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="school">School</SelectItem>
                    <SelectItem value="open">Open Tournament</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {accountType === 'school' && (
                <div>
                  <Label>School Level *</Label>
                  <Select value={schoolLevel} onValueChange={(v) => setSchoolLevel(v as SchoolLevel)}>
                    <SelectTrigger><SelectValue placeholder="Base / Junior / Senior / Tertiary" /></SelectTrigger>
                    <SelectContent>
                      {SCHOOL_SUBLEVELS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Organization Name *</Label>
                  <Input required value={form.organization_name} onChange={e => update('organization_name', e.target.value)} />
                </div>
                <div>
                  <Label>Contact Name *</Label>
                  <Input required value={form.contact_name} onChange={e => update('contact_name', e.target.value)} />
                </div>
                <div>
                  <Label>Email *</Label>
                  <Input required type="email" value={form.email} onChange={e => update('email', e.target.value)} />
                </div>
                <div>
                  <Label>Phone</Label>
                  <Input value={form.phone} onChange={e => update('phone', e.target.value)} />
                </div>
                <div>
                  <Label>County *</Label>
                  <Select value={form.county} onValueChange={(v) => update('county', v)}>
                    <SelectTrigger><SelectValue placeholder="Select your county" /></SelectTrigger>
                    <SelectContent className="max-h-64 overflow-y-auto">
                      {KENYA_COUNTIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Sub-County</Label>
                  <Input value={form.subcounty} onChange={e => update('subcounty', e.target.value)} />
                </div>
                <div className="md:col-span-2">
                  <Label>Game Category *</Label>
                  <Select value={form.category} onValueChange={(v) => update('category', v)}>
                    <SelectTrigger><SelectValue placeholder="Ball Games / Athletics / Music / Other" /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map(c => <SelectItem key={c} value={c}>{CATEGORY_LABELS[c]}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    Your dashboard will manage championships in this category. Base-level (in-school) events are always free.
                  </p>
                </div>
                <div>
                  <Label>Password *</Label>
                  <Input required type="password" value={form.password} onChange={e => update('password', e.target.value)} />
                </div>
                <div>
                  <Label>Confirm Password *</Label>
                  <Input required type="password" value={form.confirm_password} onChange={e => update('confirm_password', e.target.value)} />
                </div>
              </div>
              <Button type="submit" disabled={loading} className="w-full">
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Create Account
              </Button>
              <p className="text-sm text-muted-foreground text-center">
                Already have an account? <Link to="/login" className="text-primary underline">Log in</Link>
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

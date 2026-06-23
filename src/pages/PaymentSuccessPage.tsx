import { useEffect, useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { CheckCircle2, XCircle, Loader2, ChevronLeft } from 'lucide-react';

export default function PaymentSuccessPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const reference = params.get('reference') || params.get('trxref');
  const [state, setState] = useState<'verifying' | 'success' | 'failed'>('verifying');
  const [message, setMessage] = useState('');
  const [paymentType, setPaymentType] = useState<'subscription' | 'team_fee' | ''>('');

  useEffect(() => {
    if (!reference) { setState('failed'); setMessage('Missing payment reference'); return; }
    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke('verify-payment', {
          body: { reference },
        });
        if (error) throw error;
        if (data?.success) {
          setState('success');
          setPaymentType(data?.type === 'team_fee' ? 'team_fee' : 'subscription');
          setMessage(data?.type === 'team_fee' ? 'Your team registration is confirmed.' : 'Your subscription is now active.');
        }
        else { setState('failed'); setMessage(data?.message || 'Payment could not be verified.'); }
      } catch (e: any) {
        setState('failed'); setMessage(e.message || 'Verification failed');
      }
    })();
  }, [reference]);

  useEffect(() => {
    if (state !== 'success') return;
    const timer = window.setTimeout(() => {
      navigate(paymentType === 'team_fee' ? '/open-tournaments' : '/admin', { replace: true });
    }, 1500);
    return () => window.clearTimeout(timer);
  }, [state, navigate, paymentType]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-xl mx-auto px-4 py-10">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Home
        </Link>
        <Card>
          <CardHeader className="text-center">
            {state === 'verifying' && <Loader2 className="w-16 h-16 mx-auto animate-spin text-primary" />}
            {state === 'success' && <CheckCircle2 className="w-16 h-16 mx-auto text-green-500" />}
            {state === 'failed' && <XCircle className="w-16 h-16 mx-auto text-destructive" />}
            <CardTitle className="mt-4">
              {state === 'verifying' && 'Verifying payment…'}
              {state === 'success' && 'Payment successful!'}
              {state === 'failed' && 'Payment issue'}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">{message}</p>
            {reference && <p className="text-xs text-muted-foreground">Ref: {reference}</p>}
            {state === 'success' && paymentType === 'team_fee' && (
              <Link to="/open-tournaments"><Button>View open tournaments</Button></Link>
            )}
            {state === 'success' && paymentType !== 'team_fee' && (
              <Link to="/admin"><Button>Go to Dashboard</Button></Link>
            )}
            {state === 'failed' && (
              <Link to="/pricing"><Button variant="outline">Back to Pricing</Button></Link>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

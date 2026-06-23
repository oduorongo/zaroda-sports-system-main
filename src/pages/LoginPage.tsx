import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAdmin } from '@/contexts/AdminContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, ChevronLeft, Lock, Mail } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  const { login, changePassword, isAdmin, isLoading: authLoading } = useAdmin();
  const navigate = useNavigate();
  const [signedIn, setSignedIn] = useState(false);

  // Once the user is signed in AND the admin role has been confirmed by the
  // context, redirect to the dashboard. Avoids the previous race where we
  // navigated before isAdmin flipped to true and AdminDashboard bounced back.
  useEffect(() => {
    if (signedIn && !authLoading && isAdmin) {
      navigate('/admin', { replace: true });
    }
  }, [signedIn, authLoading, isAdmin, navigate]);

  // Already-signed-in admin landing on /login: send straight through.
  useEffect(() => {
    if (!signedIn && !authLoading && isAdmin) {
      navigate('/admin', { replace: true });
    }
  }, [signedIn, authLoading, isAdmin, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setError('Please enter both email and password');
      setIsLoading(false);
      return;
    }

    const result = await login(trimmedEmail, password);
    setIsLoading(false);

    if (result.success) {
      setSignedIn(true);
      // Effect above will navigate as soon as the role check resolves.
    } else {
      setError(result.error || 'Invalid credentials');
    }
  };

  const handleChangePassword = async () => {
    if (!isAdmin) {
      toast.error('Sign in first, then change your password from this dialog.');
      return;
    }
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error('Please fill in every field');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setResetLoading(true);
    const result = await changePassword(currentPassword, newPassword);
    setResetLoading(false);

    if (result.success) {
      toast.success('Password updated. Please sign in again with the new password.');
      setForgotPasswordOpen(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } else {
      toast.error(result.error || 'Failed to update password');
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4" style={{ paddingTop: '40px' }}>
      <div className="w-full max-w-md">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Home
        </Link>

        <div className="bg-card rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '24px' }}>
              <img
                src="/zaroda-logo.png"
                alt="Zaroda Sports Management System"
                style={{ height: '110px', width: 'auto', objectFit: 'contain', marginBottom: '8px' }}
              />
            </div>
            <h1 className="font-display text-3xl text-foreground">ADMIN LOGIN</h1>
            <p className="text-muted-foreground mt-2">Sign in to manage the sports system</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="pl-10"
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="pl-10"
                  autoComplete="current-password"
                />
              </div>
            </div>

            <Button type="submit" className="w-full bg-primary hover:bg-primary/90" disabled={isLoading}>
              {isLoading ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Signing in...</>
              ) : 'Sign In'}
            </Button>
          </form>

          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => setForgotPasswordOpen(true)}
              className="text-sm text-secondary hover:underline"
            >
              Change Password
            </button>
          </div>
        </div>
      </div>

      <Dialog open={forgotPasswordOpen} onOpenChange={setForgotPasswordOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Change Admin Password</DialogTitle>
            <p className="text-muted-foreground text-sm mt-1">
              You must be signed in. Enter your current password and the new one.
            </p>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="current_pw">Current Password</Label>
              <Input id="current_pw" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new_pw">New Password</Label>
              <Input id="new_pw" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm_pw">Confirm New Password</Label>
              <Input id="confirm_pw" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setForgotPasswordOpen(false)}>Cancel</Button>
            <Button onClick={handleChangePassword} disabled={resetLoading}>
              {resetLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Update Password
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LoginPage;

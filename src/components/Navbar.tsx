import { Link, useLocation } from 'react-router-dom';
import { Dribbble, Music, Users, Target, Shield, Menu, X, FileText, Share2, CreditCard, UserPlus, CircleUserRound } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { shareWithMessage } from '@/lib/share';

const categoryLinks = [
  { path: '/category/ball_games', label: 'Ball Games', icon: Dribbble },
  { path: '/category/athletics', label: 'Athletics', icon: Users },
  { path: '/category/music', label: 'Music', icon: Music },
  { path: '/category/other', label: 'Other Games', icon: Target },
];

const utilityLinks = [
  { path: '/circulars', label: 'Circulars', icon: FileText },
  { path: '/contacts', label: 'Contacts', icon: Users },
  { href: '/user-guide.html', label: 'User Support', icon: CircleUserRound },
  { path: '/pricing', label: 'Pricing', icon: CreditCard },
];

const handleShare = async () => {
  await shareWithMessage();
};

export const Navbar = () => {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 bg-primary shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between" style={{ minHeight: '90px', alignItems: 'center' }}>
          <Link to="/" className="flex items-center gap-3">
            <img 
              className="h-[56px] md:h-[72px] w-auto drop-shadow-md"
              src="/zaroda-logo.png" 
              loading="eager"
              alt="Zaroda Sports Management"
              style={{ objectFit: 'contain' }}
            />
        
          </Link>

          <div className="hidden lg:flex items-center gap-1">
            {categoryLinks.map((item) => {
              const isActive = item.path ? location.pathname.startsWith(item.path) : false;
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-secondary text-secondary-foreground'
                      : 'text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary/80'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </Link>
              );
            })}
          </div>

          <div className="hidden lg:flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={handleShare} className="text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary/80">
              <Share2 className="w-4 h-4 mr-1" />Share
            </Button>
            {utilityLinks.map((item) => {
              const Icon = item.icon;
              if (item.href) {
                return (
                  <a
                    key={item.label}
                    href={item.href}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary/80 transition-all"
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </a>
                );
              }
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary/80 transition-all"
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </Link>
              );
            })}
            <Link
              to="/signup"
              className="flex items-center gap-2 px-3 py-2 bg-secondary text-secondary-foreground rounded-lg text-sm font-medium hover:bg-secondary/90 transition-all"
            >
              <UserPlus className="w-4 h-4" />Sign Up
            </Link>
            <Link
              to="/login"
              className="flex items-center gap-2 px-3 py-2 border border-primary-foreground/30 text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary-foreground/10 transition-all"
            >
              <Shield className="w-4 h-4" />Login
            </Link>
          </div>

          <button className="lg:hidden text-primary-foreground p-2" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="lg:hidden py-4 border-t border-primary-foreground/20 animate-fade-in">
            {categoryLinks.map((item) => {
              const isActive = item.path ? location.pathname.startsWith(item.path) : false;
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-all ${
                    isActive ? 'bg-secondary text-secondary-foreground' : 'text-primary-foreground/80 hover:text-primary-foreground'
                  }`}
                >
                  <Icon className="w-5 h-5" />{item.label}
                </Link>
              );
            })}
            {utilityLinks.map((item) => {
              const Icon = item.icon;
              if (item.href) {
                return (
                  <a
                    key={item.label}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 text-primary-foreground/80 hover:text-primary-foreground rounded-lg font-medium"
                  >
                    <Icon className="w-5 h-5" />{item.label}
                  </a>
                );
              }
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 text-primary-foreground/80 hover:text-primary-foreground rounded-lg font-medium"
                >
                  <Icon className="w-5 h-5" />{item.label}
                </Link>
              );
            })}
            <button
              onClick={() => { handleShare(); setMobileMenuOpen(false); }}
              className="flex items-center gap-3 px-4 py-3 text-primary-foreground/80 hover:text-primary-foreground rounded-lg font-medium w-full"
            >
              <Share2 className="w-5 h-5" />Share
            </button>
            <div className="mt-4 pt-4 border-t border-primary-foreground/20 flex flex-col gap-2">
              <Link to="/signup" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 px-4 py-3 bg-secondary text-secondary-foreground rounded-lg font-medium">
                <UserPlus className="w-5 h-5" />Sign Up
              </Link>
              <Link to="/login" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 px-4 py-3 text-primary-foreground/80 hover:text-primary-foreground rounded-lg font-medium">
                <Shield className="w-5 h-5" />Login
              </Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

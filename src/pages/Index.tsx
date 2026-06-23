import { useChampionships } from '@/hooks/useChampionships';
import { CategoryCard } from '@/components/CategoryCard';
import { Navbar } from '@/components/Navbar';
import { GameCategory, LEVEL_LABELS, SCHOOL_LEVEL_LABELS } from '@/types/database';
import { Trophy, ChevronRight, Calendar, MapPin } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useTenantSubscription } from '@/hooks/useSubscription';
import { Badge } from '@/components/ui/badge';
import heroSports from '@/assets/hero-background.jpg';
import sportSoccer from '@/assets/sport-soccer.jpg';
import sportAthletics from '@/assets/sport-athletics.jpg';
import sportVolleyball from '@/assets/sport-volleyball.jpg';

const categories: GameCategory[] = ['ball_games', 'athletics', 'music', 'other'];

const Index = () => {
  const { data: championships = [] } = useChampionships();
  const navigate = useNavigate();
  const { tenant, activeSubscription } = useTenantSubscription();

  const handleGetStarted = () => {
    if (!tenant) return navigate('/signup');
    if (championships.some((championship) => championship.tenant_id === tenant.id)) {
      return navigate('/admin');
    }
    if (activeSubscription) return navigate('/admin');
    return navigate('/pricing');
  };

  const upcomingChamps = championships.filter(c => {
    if (!c.start_date) return true;
    return new Date(c.start_date) >= new Date(new Date().toDateString());
  }).slice(0, 3);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero Section */}
      <section className="relative text-white overflow-hidden">
        <img
          src={heroSports}
          alt="Zaroda sports championship"
          className="absolute inset-0 w-full h-full object-cover"
          width={1920}
          height={1080}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-primary/70 via-primary/50 to-[hsl(var(--navy-dark))]/80" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,hsl(var(--secondary)/0.25),transparent_65%)]" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24 relative">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full mb-6 border border-white/20">
              <Trophy className="w-5 h-5 text-secondary" />
              <span className="text-sm font-medium tracking-widest uppercase">
                Zaroda Sports Management System
              </span>
            </div>
            <p className="text-base md:text-lg text-white/80 max-w-2xl mx-auto mb-8">
              Zaroda Sports takes you from Registration to Champions — seamlessly managed.
              Track competitions from Zone to National across Ball Games, Athletics, Music & more.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <button
                onClick={handleGetStarted}
                className="inline-flex items-center gap-2 bg-secondary text-secondary-foreground px-6 py-3 rounded-lg font-bold hover:bg-secondary/90 transition-colors shadow-lg"
              >
                Get Started <ChevronRight className="w-4 h-4" />
              </button>
              <Link
                to="/pricing"
                className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/30 text-white px-6 py-3 rounded-lg font-medium hover:bg-white/20 transition-colors"
              >
                View Pricing
              </Link>
            </div>
            <div className="mt-10 grid grid-cols-2 md:grid-cols-5 gap-3 max-w-3xl mx-auto text-xs md:text-sm">
              {[
                'Team & Athlete Registration',
                'Automatic Seeding',
                'Pools & Fixtures',
                'Live Results & Rankings',
                'Finals & Winners',
              ].map(label => (
                <div
                  key={label}
                  className="bg-white/5 border border-white/15 backdrop-blur-sm rounded-lg px-3 py-3 text-white/90"
                >
                  {label}
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
            <path
              d="M0 120L60 110C120 100 240 80 360 70C480 60 600 60 720 65C840 70 960 80 1080 85C1200 90 1320 90 1380 90L1440 90V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z"
              fill="hsl(var(--background))"
            />
          </svg>
        </div>
      </section>

      {/* Upcoming Championships */}
      {upcomingChamps.length > 0 && (
        <section className="py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="font-display text-3xl text-foreground mb-6">UPCOMING CHAMPIONSHIPS</h2>
            <div className="grid md:grid-cols-3 gap-4">
              {upcomingChamps.map(c => (
                <div key={c.id} className="bg-card border border-border rounded-xl p-5">
                  <h3 className="font-display text-xl text-foreground">{c.name}</h3>
                  <div className="flex gap-2 mt-2">
                    <Badge variant="secondary">{LEVEL_LABELS[c.level]}</Badge>
                    <Badge variant="outline">{SCHOOL_LEVEL_LABELS[c.school_level]}</Badge>
                  </div>
                  {c.location && (
                    <p className="text-sm text-muted-foreground mt-2 flex items-center gap-1">
                      <MapPin className="w-3 h-3" />{c.location}
                    </p>
                  )}
                  {c.start_date && (
                    <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {c.start_date}{c.end_date ? ` — ${c.end_date}` : ''}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Browse By Category */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="font-display text-4xl md:text-5xl text-foreground mb-4">
              BROWSE BY CATEGORY
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Select a category to view all games, participants, and results
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {categories.map(category => (
              <CategoryCard key={category} category={category} />
            ))}
          </div>
        </div>
      </section>

      {/* Sports Showcase */}
      <section className="py-16 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="font-display text-4xl md:text-5xl text-foreground mb-3">
              EVERY SPORT. EVERY LEVEL.
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              From school playgrounds to national finals — captured beautifully.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {[
              { src: sportSoccer, title: 'Ball Games', desc: 'Football, Volleyball, Basketball, Handball, Netball, Hockey' },
              { src: sportAthletics, title: 'Athletics', desc: 'Track & Field events from heats to national finals' },
              { src: sportVolleyball, title: 'Open Tournaments', desc: 'Custom tournaments for clubs, federations and communities' },
            ].map((s) => (
              <div
                key={s.title}
                className="group relative overflow-hidden rounded-2xl shadow-lg hover:shadow-2xl transition-all"
              >
                <img
                  src={s.src}
                  alt={s.title}
                  loading="lazy"
                  width={1024}
                  height={768}
                  className="w-full h-64 object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-primary via-primary/60 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-5 text-white">
                  <h3 className="font-display text-2xl mb-1">{s.title}</h3>
                  <p className="text-sm text-white/85">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gradient-to-br from-primary to-primary/80 text-white">
        <div className="max-w-5xl mx-auto px-4 text-center">
          <h2 className="font-display text-4xl md:text-5xl mb-4">
            READY TO RUN YOUR CHAMPIONSHIP?
          </h2>
          <p className="text-white/80 max-w-2xl mx-auto mb-8">
            Join schools, counties and federations using Zaroda Sports to manage competitions
            from Zone level all the way to National finals.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <button
              onClick={handleGetStarted}
              className="bg-secondary text-secondary-foreground px-8 py-3 rounded-lg font-bold hover:bg-secondary/90 transition shadow-lg"
            >
              Get Started
            </button>
            <Link
              to="/pricing"
              className="bg-white/10 border border-white/30 px-8 py-3 rounded-lg font-medium hover:bg-white/20 transition"
            >
              View Pricing
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gradient-to-b from-primary to-[hsl(var(--navy-dark))] text-primary-foreground pt-16 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-10 mb-12">
            <div className="md:col-span-1">
              <img
                src="/zaroda-logo.png"
                alt="Zaroda Sports Management System"
                className="h-20 w-auto mb-4"
              />
              <p className="text-sm text-primary-foreground/70 leading-relaxed">
                Schools are going digital — sports should too. Zaroda Sports is the
                all-in-one championship management platform.
              </p>
            </div>
            <div>
              <h4 className="font-display text-lg mb-4 text-secondary">Categories</h4>
              <ul className="space-y-2 text-sm text-primary-foreground/80">
                <li><Link to="/category/ball_games" className="hover:text-secondary transition">Ball Games</Link></li>
                <li><Link to="/category/athletics" className="hover:text-secondary transition">Athletics</Link></li>
                <li><Link to="/category/music" className="hover:text-secondary transition">Music</Link></li>
                <li><Link to="/category/other" className="hover:text-secondary transition">Other Games</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-display text-lg mb-4 text-secondary">Explore</h4>
              <ul className="space-y-2 text-sm text-primary-foreground/80">
                <li><Link to="/circulars" className="hover:text-secondary transition">Circulars</Link></li>
                <li><Link to="/contacts" className="hover:text-secondary transition">Contacts</Link></li>
                <li><Link to="/pricing" className="hover:text-secondary transition">Pricing</Link></li>
                <li><a href="/user-guide.html" className="hover:text-secondary transition">User Support</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-display text-lg mb-4 text-secondary">Get In Touch</h4>
              <ul className="space-y-2 text-sm text-primary-foreground/80">
                <li><Link to="/contacts" className="hover:text-secondary transition">Contact Us</Link></li>
                <li><Link to="/signup" className="hover:text-secondary transition">Sign Up</Link></li>
                <li><Link to="/login" className="hover:text-secondary transition">Admin Login</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-white/10 pt-6 flex flex-col md:flex-row items-center justify-between gap-3">
            <p className="text-primary-foreground/60 text-sm">
              © 2026 Zaroda Sports System. All rights reserved.
            </p>
            <p className="text-primary-foreground/50 text-xs tracking-widest uppercase">
              Built for Champions • Powered by Zaroda Solutions
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
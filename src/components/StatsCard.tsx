import { Trophy, Users, Target, MapPin } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: number | string;
  icon: 'trophy' | 'users' | 'target' | 'location';
  description?: string;
}

const icons = {
  trophy: Trophy,
  users: Users,
  target: Target,
  location: MapPin,
};

export const StatsCard = ({ title, value, icon, description }: StatsCardProps) => {
  const Icon = icons[icon];
  
  return (
    <div className="bg-card border border-border rounded-xl p-6">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-secondary/10 rounded-xl flex items-center justify-center">
          <Icon className="w-6 h-6 text-secondary" />
        </div>
        <div>
          <p className="text-muted-foreground text-sm font-medium">{title}</p>
          <p className="text-3xl font-display text-foreground">{value}</p>
          {description && (
            <p className="text-xs text-muted-foreground mt-1">{description}</p>
          )}
        </div>
      </div>
    </div>
  );
};

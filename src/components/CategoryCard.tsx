import { Link } from 'react-router-dom';
import { GameCategory, CATEGORY_LABELS } from '@/types/database';
import { ArrowRight, Dribbble, Users, Music, Target } from 'lucide-react';

const categoryIcons = {
  ball_games: Dribbble,
  athletics: Users,
  music: Music,
  other: Target,
};

const categoryGradients = {
  ball_games: 'from-emerald-500 to-teal-600',
  athletics: 'from-orange-500 to-red-500',
  music: 'from-purple-500 to-pink-500',
  other: 'from-blue-500 to-indigo-600',
};

interface CategoryCardProps {
  category: GameCategory;
  gameCount?: number;
}

export const CategoryCard = ({ category, gameCount }: CategoryCardProps) => {
  const Icon = categoryIcons[category];
  const gradient = categoryGradients[category];

  return (
    <Link
      to={`/category/${category}`}
      className="group relative overflow-hidden rounded-2xl bg-card shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
    >
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-90`} />
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
      
      <div className="relative p-8 h-64 flex flex-col justify-between text-white">
        <div>
          <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <Icon className="w-8 h-8" />
          </div>
          <h3 className="font-display text-3xl tracking-wide">
            {CATEGORY_LABELS[category]}
          </h3>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-white/80 font-medium">
            {typeof gameCount === 'number' ? `${gameCount} ${gameCount === 1 ? 'Game' : 'Games'}` : 'View'}
          </span>
          <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center group-hover:bg-white/30 transition-colors">
            <ArrowRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>
      </div>
    </Link>
  );
};

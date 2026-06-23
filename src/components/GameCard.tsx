import { Link } from 'react-router-dom';
import { Game, LEVEL_LABELS, GENDER_LABELS, SCHOOL_LEVEL_LABELS } from '@/types/database';
import { Clock, Users, Trophy, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface GameCardProps {
  game: Game;
  participantCount?: number;
}

export const GameCard = ({ game, participantCount = 0 }: GameCardProps) => {
  return (
    <Link
      to={`/game/${game.id}`}
      className="group block bg-card border border-border rounded-xl p-6 hover:shadow-lg hover:border-secondary/50 transition-all duration-300"
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-display text-2xl text-foreground group-hover:text-secondary transition-colors">
            {game.name}
          </h3>
          <div className="flex flex-wrap gap-2 mt-2">
            <Badge variant="secondary">
              {LEVEL_LABELS[game.level]}
            </Badge>
            <Badge variant="outline" className={game.gender === 'boys' ? 'border-blue-400 text-blue-600' : 'border-pink-400 text-pink-600'}>
              {GENDER_LABELS[game.gender]}
            </Badge>
            <Badge variant="outline">
              {SCHOOL_LEVEL_LABELS[game.school_level]}
            </Badge>
          </div>
        </div>
        <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center group-hover:bg-secondary group-hover:text-secondary-foreground transition-colors">
          <ChevronRight className="w-5 h-5" />
        </div>
      </div>
      
      {game.description && (
        <p className="text-muted-foreground text-sm mb-4 line-clamp-2">
          {game.description}
        </p>
      )}
      
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <Users className="w-4 h-4" />
          <span>{participantCount} Participants</span>
        </div>
        {game.is_timed && (
          <div className="flex items-center gap-1.5">
            <Clock className="w-4 h-4" />
            <span>Timed</span>
          </div>
        )}
        <div className="flex items-center gap-1.5">
          <Trophy className="w-4 h-4" />
          <span>Top {game.max_qualifiers} Qualify</span>
        </div>
      </div>
    </Link>
  );
};

import { Participant, GENDER_LABELS } from '@/types/database';
import { Trophy, Medal, Clock, CheckCircle2 } from 'lucide-react';
import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface ParticipantsTableProps {
  participants: Participant[];
  isTimed?: boolean;
  showGame?: boolean;
}

const normalizeDisplayValue = (value?: string | null) => {
  const trimmed = (value ?? '').trim();
  if (!trimmed) return '';
  if (/^n\/?a$/i.test(trimmed)) return '';
  if (/^unknown$/i.test(trimmed)) return '';
  if (trimmed === '-') return '';
  return trimmed;
};

const formatTime = (seconds?: number) => {
  if (!seconds) return '-';
  const mins = Math.floor(seconds / 60);
  const secs = (seconds % 60).toFixed(2);
  return mins > 0 ? `${mins}:${secs.padStart(5, '0')}` : `${secs}s`;
};

const getPositionBadge = (position?: number | null) => {
  if (!position) {
    return <span className="text-muted-foreground">-</span>;
  }

  if (position === 1) {
    return (
      <div className="flex items-center gap-1 text-yellow-600">
        <Trophy className="w-5 h-5" />
        <span className="font-bold">1st</span>
      </div>
    );
  }
  if (position === 2) {
    return (
      <div className="flex items-center gap-1 text-gray-500">
        <Medal className="w-5 h-5" />
        <span className="font-bold">2nd</span>
      </div>
    );
  }
  if (position === 3) {
    return (
      <div className="flex items-center gap-1 text-amber-700">
        <Medal className="w-5 h-5" />
        <span className="font-bold">3rd</span>
      </div>
    );
  }

  // For 4, 5, 6 (and any other recorded position), show the recorded number directly.
  return <span className="text-muted-foreground">{position}</span>;
};

export const ParticipantsTable = ({ participants, isTimed, showGame }: ParticipantsTableProps) => {
  const sortedParticipants = useMemo(() => {
    return [...participants].sort((a, b) => {
      const posA = a.position ?? Number.MAX_SAFE_INTEGER;
      const posB = b.position ?? Number.MAX_SAFE_INTEGER;
      if (posA !== posB) return posA - posB;

      if (isTimed && a.time_taken != null && b.time_taken != null && a.time_taken !== b.time_taken) {
        return a.time_taken - b.time_taken;
      }

      const nameA = `${a.first_name} ${a.last_name}`.toLowerCase();
      const nameB = `${b.first_name} ${b.last_name}`.toLowerCase();
      return nameA.localeCompare(nameB);
    });
  }, [participants, isTimed]);

  const getTeamName = (participant: Participant) => {
    return normalizeDisplayValue(participant.school?.name) || '-';
  };

  const getSchoolName = (participant: Participant) => {
    // School name entered in the form
    const fromField = normalizeDisplayValue(participant.school_name);
    if (fromField) return fromField;

    // Legacy: stored in notes
    if (participant.notes) {
      const match = participant.notes.match(/(?:^|\|)\s*school:([^|]+)/i);
      if (match?.[1]) return match[1].trim();
    }
    return '';
  };

  const getLocationParts = (participant: Participant) => {
    const parts = [
      normalizeDisplayValue(participant.school?.zone),
      normalizeDisplayValue(participant.school?.subcounty),
      normalizeDisplayValue(participant.school?.county),
    ].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : '';
  };

  return (
    <div className="rounded-xl border border-border overflow-hidden bg-card">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="w-20">Rank</TableHead>
            <TableHead>Participant</TableHead>
            <TableHead>Gender</TableHead>
            <TableHead>Team</TableHead>
            <TableHead>School</TableHead>
            <TableHead>Location</TableHead>
            {showGame && <TableHead>Game</TableHead>}
            {isTimed && <TableHead className="text-right">Time</TableHead>}
            <TableHead className="text-right">Score</TableHead>
            <TableHead className="text-center">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedParticipants.length === 0 ? (
            <TableRow>
              <TableCell colSpan={showGame ? 10 : 9} className="text-center py-12 text-muted-foreground">
                No participants yet
              </TableCell>
            </TableRow>
          ) : (
            sortedParticipants.map((participant) => {
              const teamName = getTeamName(participant);
              const schoolName = getSchoolName(participant);
              const location = getLocationParts(participant);

              return (
              <TableRow key={participant.id} className="hover:bg-muted/30">
                <TableCell>{getPositionBadge(participant.position)}</TableCell>
                <TableCell>
                  <div className="font-medium">
                    {participant.first_name} {participant.last_name}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={participant.gender === 'boys' ? 'border-blue-400 text-blue-600' : 'border-pink-400 text-pink-600'}>
                    {GENDER_LABELS[participant.gender]}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="font-medium text-foreground">
                    {teamName}
                  </div>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{schoolName || '-'}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{location || '-'}</TableCell>
                {showGame && (
                  <TableCell>
                    <Badge variant="outline">{participant.game?.name}</Badge>
                  </TableCell>
                )}
                {isTimed && (
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1 font-mono">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      {formatTime(participant.time_taken)}
                    </div>
                  </TableCell>
                )}
                <TableCell className="text-right font-medium">
                  {participant.score ?? '-'}
                </TableCell>
                <TableCell className="text-center">
                  {participant.is_qualified ? (
                    <Badge className="bg-success text-success-foreground">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Qualified
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-muted-foreground">
                      Pending
                    </Badge>
                  )}
                </TableCell>
              </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
};

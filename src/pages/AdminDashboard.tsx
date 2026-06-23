import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { useDebouncedCallback } from 'use-debounce';
import { useAdmin } from '@/contexts/AdminContext';
import { supabase } from '@/integrations/supabase/client';
import { useGames, useCreateGame, useUpdateGame, useDeleteGame } from '@/hooks/useGames';
import { useSchools, useCreateSchool, useUpdateSchool, useDeleteSchool } from '@/hooks/useSchools';
import { useParticipants, useCreateParticipant, useUpdateParticipant, useDeleteParticipant, useBulkUpdateQualified, useRankByTime } from '@/hooks/useParticipants';
import { useChampionships, useCreateChampionship, useUpdateChampionship, useDeleteChampionship } from '@/hooks/useChampionships';
import { useTenantSubscription } from '@/hooks/useSubscription';
import { useCirculars, useCreateCircular, useUpdateCircular, useDeleteCircular } from '@/hooks/useCirculars';
import { useHeats, useCreateHeat, useDeleteHeat, useAllHeatParticipants, useAddHeatParticipant, useUpdateHeatParticipant, useDeleteHeatParticipant } from '@/hooks/useHeats';
import { useMatchPools, useCreateMatchPool, useUpdateMatchPool, useDeleteMatchPool } from '@/hooks/useMatchPools';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from 'sonner';
import { 
  Game, School, Participant, Championship, GameCategory, CompetitionLevel, Gender, SchoolLevel,
  CATEGORY_LABELS, LEVEL_LABELS, GENDER_LABELS, SCHOOL_LEVEL_LABELS, RACE_TYPE_LABELS
} from '@/types/database';
import { 
  Plus, Pencil, Trash2, LogOut, Home, Trophy, Users, 
  MapPin, Target, Clock, CheckCircle2, Loader2, Timer, BarChart3,
  FileText, Award, Swords, Search, Hash
} from 'lucide-react';
import { Sparkles } from 'lucide-react';
import { BibSeedingPanel } from '@/components/BibSeedingPanel';
import { AdminManagementPanel } from '@/components/AdminManagementPanel';
import { SuperAdminTenantsPanel } from '@/components/SuperAdminTenantsPanel';
import { SuperAdminMyChampionshipsPanel } from '@/components/SuperAdminMyChampionshipsPanel';
import { SuperAdminOverview } from '@/components/SuperAdminOverview';
import { MessagesPanel } from '@/components/MessagesPanel';
import { OpenTournamentPanel } from '@/components/OpenTournamentPanel';
import { UserCog, Building2, MessageSquare, DollarSign, Crown, LayoutDashboard, ArrowLeft } from 'lucide-react';
import { devLog, devWarn, devError, devDebug } from '@/lib/dev';
import { formatChampionshipName, stripChampionshipLevelSuffix } from '@/lib/championship';

// Time parsing: accepts "12.06", "0.12.06", "0:12.06", "1:23.45"
const parseTimeInput = (input: string): number | null => {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const parts = trimmed.split(/[:.]/);
  if (parts.length === 3) {
    const mins = parseInt(parts[0]) || 0;
    const secs = parseInt(parts[1]) || 0;
    const cs = parseInt(parts[2]) || 0;
    return mins * 60 + secs + cs / 100;
  }
  const num = parseFloat(trimmed);
  return isNaN(num) ? null : num;
};

const formatTimeDisplay = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  const wholeSecs = Math.floor(remaining);
  const cs = Math.round((remaining - wholeSecs) * 100);
  return `${mins}.${wholeSecs.toString().padStart(2, '0')}.${cs.toString().padStart(2, '0')}`;
};

// Points by position: 1st=7, 2nd=5, 3rd=4, 4th=3, 5th=2, 6th=1
const getPointsForPosition = (pos: number | null | undefined): number | undefined => {
  if (!pos) return undefined;
  const map: Record<number, number> = { 1: 7, 2: 5, 3: 4, 4: 3, 5: 2, 6: 1 };
  return map[pos] ?? undefined;
};

const parseSchoolFromNotes = (notes?: string): string => {
  if (!notes) return '';
  const schoolMatch = notes.match(/(?:^|\|)\s*school:([^|]+)/i);
  if (schoolMatch?.[1]) return schoolMatch[1].trim();
  const legacyPrefix = 'School: ';
  if (notes.startsWith(legacyPrefix)) return notes.slice(legacyPrefix.length).trim();
  return '';
};

const normalizeCompetitionLevel = (value?: string | null): CompetitionLevel | '' => {
  const normalized = (value || '').trim().toLowerCase().replace(/[-\s]/g, '');
  if (normalized === 'base') return 'base';
  if (normalized === 'zone') return 'zone';
  if (normalized === 'subcounty') return 'subcounty';
  if (normalized === 'county') return 'county';
  if (normalized === 'region') return 'region';
  if (normalized === 'national') return 'national';
  return '';
};

const inferCompetitionLevelFromTeamName = (name: string): CompetitionLevel | '' => {
  const upper = name.toUpperCase();
  if (upper.includes(' BASE')) return 'base';
  if (upper.includes(' ZONE')) return 'subcounty';
  return '';
};

const parseTeamMetaFromZone = (zoneValue?: string | null) => {
  const raw = (zoneValue || '').trim();
  if (!raw) return { championshipId: '', level: '' as CompetitionLevel | '' };

  if (!raw.includes('|')) {
    return { championshipId: '', level: normalizeCompetitionLevel(raw) };
  }

  const parts = raw.split('|');
  let championshipId = '';
  let level: CompetitionLevel | '' = '';

  for (const part of parts) {
    const [key, value] = part.split(':');
    if (!key || !value) continue;
    const normalizedKey = key.trim().toLowerCase();
    const normalizedValue = value.trim();

    if (normalizedKey === 'championship') championshipId = normalizedValue;
    if (normalizedKey === 'level') level = normalizeCompetitionLevel(normalizedValue);
  }

  return { championshipId, level };
};

const encodeTeamMetaForZone = (championshipId: string, level: CompetitionLevel) => {
  return `championship:${championshipId}|level:${level}`;
};

const getTeamChampionshipId = (school: School): string => {
  return parseTeamMetaFromZone(school.zone).championshipId;
};

const getTeamCompetitionLevel = (school: School): CompetitionLevel | '' => {
  return parseTeamMetaFromZone(school.zone).level || inferCompetitionLevelFromTeamName(school.name);
};

const AdminDashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { isAdmin, isSuperAdmin, isLevelAdmin, championshipId, tenantId, isLoading: authLoading, logout } = useAdmin();
  const { tenant, activeSubscription, loading: subscriptionLoading } = useTenantSubscription();

  const [activeTab, setActiveTab] = useState('games');

  const shouldLoadGames = activeTab === 'games' || activeTab === 'participants' || activeTab === 'heats' || activeTab === 'pooling';
  const shouldLoadSchools = activeTab === 'schools' || activeTab === 'participants' || activeTab === 'heats' || activeTab === 'pooling';
  const shouldLoadParticipants = activeTab === 'participants' || activeTab === 'heats';
  const shouldLoadChampionships = activeTab === 'games' || activeTab === 'participants' || activeTab === 'schools' || activeTab === 'heats' || activeTab === 'championships' || activeTab === 'circulars';
  const shouldLoadCirculars = activeTab === 'circulars';

  // Tenants are scoped to championships they own (their tenant_id). Super admins see everything.
  const tenantScope = !isSuperAdmin ? (tenantId ?? undefined) : undefined;

  const { data: allGames = [], isLoading: gamesLoading } = useGames(undefined, shouldLoadGames, championshipId ?? undefined);
  const { data: schools = [], isLoading: schoolsLoading } = useSchools(shouldLoadSchools, championshipId ?? undefined);
  const { data: allParticipants = [], isLoading: participantsLoading } = useParticipants(undefined, shouldLoadParticipants, championshipId ?? undefined);
  const { data: allChampionships = [] } = useChampionships(shouldLoadChampionships, championshipId ?? undefined, tenantScope);
  const { data: circulars = [] } = useCirculars(shouldLoadCirculars);

  // Championships the current operator is allowed to manage.
  const championships = useMemo(() => {
    if (isSuperAdmin) return allChampionships;
    if (isLevelAdmin && championshipId) {
      return allChampionships.filter((c) => c.id === championshipId);
    }
    // Tenant: useChampionships already filtered to their tenant_id.
    return allChampionships;
  }, [allChampionships, isSuperAdmin, isLevelAdmin, championshipId]);

  // The set of championship ids the operator owns — used to scope games/participants.
  const ownedChampionshipIds = useMemo(
    () => new Set(championships.map((c) => c.id)),
    [championships],
  );

  // Scope visible games/participants for non-super-admins to their own championships.
  const games = useMemo(
    () => (isSuperAdmin
      ? allGames
      : allGames.filter((g) => g.championship_id && ownedChampionshipIds.has(g.championship_id))),
    [allGames, isSuperAdmin, ownedChampionshipIds],
  );
  const scopedGameIds = useMemo(() => new Set(games.map((g) => g.id)), [games]);
  const participants = useMemo(
    () => (isSuperAdmin
      ? allParticipants
      : allParticipants.filter((p) => scopedGameIds.has(p.game_id))),
    [allParticipants, isSuperAdmin, scopedGameIds],
  );
  
  const createGame = useCreateGame();
  const updateGame = useUpdateGame();
  const deleteGame = useDeleteGame();
  const createSchool = useCreateSchool();
  const updateSchool = useUpdateSchool();
  const deleteSchool = useDeleteSchool();
  const createParticipant = useCreateParticipant();
  const updateParticipant = useUpdateParticipant();
  const deleteParticipant = useDeleteParticipant();
  const bulkUpdateQualified = useBulkUpdateQualified();
  const rankByTime = useRankByTime();
  const createChampionship = useCreateChampionship();
  const updateChampionship = useUpdateChampionship();
  const deleteChampionship = useDeleteChampionship();
  const createCircular = useCreateCircular();
  const updateCircular = useUpdateCircular();
  const deleteCircular = useDeleteCircular();
  const createHeat = useCreateHeat();
  const deleteHeat = useDeleteHeat();
  const addHeatParticipant = useAddHeatParticipant();
  const updateHeatParticipant = useUpdateHeatParticipant();
  const deleteHeatParticipant = useDeleteHeatParticipant();
  const createMatchPool = useCreateMatchPool();
  const updateMatchPool = useUpdateMatchPool();
  const deleteMatchPool = useDeleteMatchPool();

  // Dialogs
  const [gameDialog, setGameDialog] = useState(false);
  const [schoolDialog, setSchoolDialog] = useState(false);
  const [participantDialog, setParticipantDialog] = useState(false);
  const [qualifyDialog, setQualifyDialog] = useState(false);
  const [championshipDialog, setChampionshipDialog] = useState(false);
  const [circularDialog, setCircularDialog] = useState(false);
  const [editingCircular, setEditingCircular] = useState<any>(null);
  const [heatDialog, setHeatDialog] = useState(false);
  const [heatParticipantDialog, setHeatParticipantDialog] = useState(false);
  const [matchDialog, setMatchDialog] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<{ type: string; id: string } | null>(null);
  
  // Editing state
  const [editingGame, setEditingGame] = useState<Game | null>(null);
  const [editingSchool, setEditingSchool] = useState<School | null>(null);
  const [editingParticipant, setEditingParticipant] = useState<Participant | null>(null);
  const [editingChampionship, setEditingChampionship] = useState<Championship | null>(null);
  const [championshipNameInput, setChampionshipNameInput] = useState('');
  const [selectedGameForQualify, setSelectedGameForQualify] = useState<Game | null>(null);
  const [selectedQualifiers, setSelectedQualifiers] = useState<string[]>([]);
  
  // Games tab filters
  const [filterCategory, setFilterCategory] = useState<GameCategory | 'all'>('all');
  const [filterGender, setFilterGender] = useState<Gender | 'all'>('all');
  const [gameSearchInput, setGameSearchInput] = useState('');
  const [gameSearchText, setGameSearchText] = useState('');
  const [gamesChampionshipFilter, setGamesChampionshipFilter] = useState<string>('');
  const [resultsCategoryFilter, setResultsCategoryFilter] = useState<SchoolLevel | ''>('');
  const [resultsChampionshipId, setResultsChampionshipId] = useState<string>('');
  const [filterGame, setFilterGame] = useState<string>('all');
  const [heatChampionshipId, setHeatChampionshipId] = useState<string>('');
  const [heatGameId, setHeatGameId] = useState<string>('');
  const [matchGameId, setMatchGameId] = useState<string>('');
  const [editingHeatParticipant, setEditingHeatParticipant] = useState<any>(null);
  const [editHpDialog, setEditHpDialog] = useState(false);
  const [hpQualifiedForFinal, setHpQualifiedForFinal] = useState(false);
  const [editHpPositionInput, setEditHpPositionInput] = useState('');
  const [teamsChampionshipFilter, setTeamsChampionshipFilter] = useState<string>('');

  // Game form state
  const [gameFormGender, setGameFormGender] = useState<Gender>('boys');
  const [gameFormSchoolLevel, setGameFormSchoolLevel] = useState<SchoolLevel>('primary_junior');
  const [gameFormCategory, setGameFormCategory] = useState<GameCategory>('ball_games');
  const [gameFormLevel, setGameFormLevel] = useState<CompetitionLevel>('zone');
  const [gameFormRaceType, setGameFormRaceType] = useState<string>('');
  const [gameFormChampionshipId, setGameFormChampionshipId] = useState<string>('');

  // Participant form state
  const [participantFormGender, setParticipantFormGender] = useState<Gender>('boys');
  const [participantFormChampionshipId, setParticipantFormChampionshipId] = useState<string>('');
  const [participantFormGameId, setParticipantFormGameId] = useState<string>('');
  const [participantSchoolInput, setParticipantSchoolInput] = useState('');
  const [teamSearchInput, setTeamSearchInput] = useState('');
  const [teamSearch, setTeamSearch] = useState('');
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [participantGameSearchInput, setParticipantGameSearchInput] = useState('');
  const [participantGameSearch, setParticipantGameSearch] = useState('');
  const [participantGameCatFilter, setParticipantGameCatFilter] = useState<GameCategory | 'all'>('all');
  const [participantGameGenderFilter, setParticipantGameGenderFilter] = useState<Gender | 'all'>('all');
  const [participantFormSchoolLevel, setParticipantFormSchoolLevel] = useState<SchoolLevel>('primary');
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>('');
  
  // Championship form
  const [champLevel, setChampLevel] = useState<CompetitionLevel>('zone');
  const [champSchoolLevel, setChampSchoolLevel] = useState<SchoolLevel>('primary_junior');
  
  // Circular form
  const [circularLevel, setCircularLevel] = useState<CompetitionLevel>('national');
  const [circularDocument, setCircularDocument] = useState<File | null>(null);
  
  // Heat form
  const [heatFormGameId, setHeatFormGameId] = useState<string>('');
  const [heatFormType, setHeatFormType] = useState<string>('heat');
  
  // Heat participant form
  const [hpHeatId, setHpHeatId] = useState<string>('');
  const [hpParticipantName, setHpParticipantName] = useState('');
  const [heatTeamSearch, setHeatTeamSearch] = useState('');
  const [heatSelectedTeamId, setHeatSelectedTeamId] = useState('');
  const [heatSchoolSearch, setHeatSchoolSearch] = useState('');

  const debouncedSetGameSearchText = useDebouncedCallback((value: string) => setGameSearchText(value), 300);
  const debouncedSetTeamSearch = useDebouncedCallback((value: string) => setTeamSearch(value), 300);
  const debouncedSetParticipantGameSearch = useDebouncedCallback((value: string) => setParticipantGameSearch(value), 300);
  
  // Match form
  const [matchFormGameId, setMatchFormGameId] = useState<string>('');
  const [matchTeamA, setMatchTeamA] = useState<string>('');
  const [matchTeamB, setMatchTeamB] = useState<string>('');
  const [editingMatchId, setEditingMatchId] = useState<string>('');

  // Team form
  const [schoolFormLevel, setSchoolFormLevel] = useState<CompetitionLevel>('zone');
  const [schoolFormChampionshipId, setSchoolFormChampionshipId] = useState<string>('');

  // Heats data
  const { data: heatsForGame = [] } = useHeats(heatGameId || undefined, activeTab === 'heats');
  const { data: allHeatParticipants = [] } = useAllHeatParticipants(heatGameId || undefined, activeTab === 'heats');
  
  // Match pools data
  const { data: matchPoolsForGame = [] } = useMatchPools(matchGameId || undefined, activeTab === 'pooling');

  const selectedParticipantChampionship = useMemo(
    () => championships.find(c => c.id === participantFormChampionshipId),
    [championships, participantFormChampionshipId]
  );

  const selectedResultsChampionship = useMemo(
    () => championships.find(c => c.id === resultsChampionshipId),
    [championships, resultsChampionshipId]
  );

  const championshipsForResultsCategory = useMemo(() => {
    if (!resultsCategoryFilter) return [];
    return championships.filter((c) => c.school_level === resultsCategoryFilter);
  }, [championships, resultsCategoryFilter]);

  const championshipsForParticipantCategory = useMemo(() => {
    if (!participantFormSchoolLevel) return [];
    if (participantFormSchoolLevel === 'primary' || participantFormSchoolLevel === 'junior_secondary') {
      return championships.filter((c) => c.school_level === 'primary_junior');
    }
    return championships.filter((c) => c.school_level === participantFormSchoolLevel);
  }, [championships, participantFormSchoolLevel]);

  const championshipsForGameCategory = useMemo(() => {
    if (!gameFormSchoolLevel) return [];
    const matchingChampionships = championships.filter((championship) => {
      if (gameFormSchoolLevel === 'primary' || gameFormSchoolLevel === 'junior_secondary') {
        return championship.school_level === 'primary_junior' || championship.school_level === gameFormSchoolLevel;
      }
      return championship.school_level === gameFormSchoolLevel;
    });

    return matchingChampionships.length > 0 ? matchingChampionships : championships;
  }, [championships, gameFormSchoolLevel]);

  // Filtered games for participant form - championship-specific + sub-level
  const filteredGamesForParticipant = useMemo(() => {
    if (!participantFormChampionshipId) return [];
    let filtered = games.filter(g => g.championship_id === participantFormChampionshipId);
    if (participantFormSchoolLevel) filtered = filtered.filter(g => g.school_level === participantFormSchoolLevel);
    if (participantGameCatFilter !== 'all') filtered = filtered.filter(g => g.category === participantGameCatFilter);
    if (participantGameGenderFilter !== 'all') filtered = filtered.filter(g => g.gender === participantGameGenderFilter);
    if (participantGameSearch.trim()) {
      const search = participantGameSearch.toLowerCase();
      filtered = filtered.filter(g => g.name.toLowerCase().includes(search));
    }
    return filtered;
  }, [games, participantFormChampionshipId, participantFormSchoolLevel, participantGameCatFilter, participantGameGenderFilter, participantGameSearch]);

  // School bib ranges (per championship)
  const { data: bibRanges = [] } = useQuery({
    queryKey: ['school_bib_ranges'],
    queryFn: async () => {
      const { data, error } = await supabase.from('school_bib_ranges').select('*');
      if (error) throw error;
      return data as Array<{ id: string; championship_id: string; school_id: string; range_start: number; range_end: number }>;
    },
  });

  // Suggest next bib for selected school + championship
  const suggestedBib = useMemo(() => {
    if (!selectedTeamId || !participantFormChampionshipId) return '';
    const range = bibRanges.find(r => r.championship_id === participantFormChampionshipId && r.school_id === selectedTeamId);
    // Used bibs in this championship for this school
    const used = new Set(
      participants
        .filter(p => p.school_id === selectedTeamId && p.game?.championship_id === participantFormChampionshipId && p.bib_number)
        .map(p => parseInt(p.bib_number as string))
        .filter(n => !isNaN(n))
    );
    if (range) {
      for (let n = range.range_start; n <= range.range_end; n++) {
        if (!used.has(n)) return String(n);
      }
      return ''; // range exhausted
    }
    // No range set — fallback: max+1 across this school in this championship
    const max = used.size ? Math.max(...Array.from(used)) : 0;
    return String(max + 1);
  }, [selectedTeamId, participantFormChampionshipId, bibRanges, participants]);

  


  const filteredGamesForResults = useMemo(() => {
    if (!resultsChampionshipId) return [];
    return games.filter(g => g.championship_id === resultsChampionshipId);
  }, [games, resultsChampionshipId]);

  const ballGames = useMemo(
    () => games.filter((game) => game.category === 'ball_games'),
    [games],
  );

  const heatsGames = useMemo(() => {
    return games.filter((g) =>
      g.category === 'athletics' && (!heatChampionshipId || g.championship_id === heatChampionshipId)
    );
  }, [games, heatChampionshipId]);

  useEffect(() => {
    if (!authLoading && !isAdmin) navigate('/login');
  }, [isAdmin, authLoading, navigate]);

  // Super admins land on the overview dashboard by default (not the operational Games tab).
  const [defaultTabSet, setDefaultTabSet] = useState(false);
  useEffect(() => {
    if (!authLoading && isSuperAdmin && !defaultTabSet && activeTab === 'games') {
      setActiveTab('overview');
      setDefaultTabSet(true);
    }
  }, [authLoading, isSuperAdmin, defaultTabSet, activeTab]);

  // If user lands here after a successful payment flow, activate dashboard and guide them.
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('payment') === 'success') {
      if (!authLoading) {
        if (isAdmin) {
          setActiveTab('games');
          toast.success('Payment successful — you can now manage your dashboard');
        } else {
          navigate('/login');
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, isAdmin]);

  useEffect(() => {
    if (editingGame) {
      setGameFormGender(editingGame.gender);
      setGameFormSchoolLevel(editingGame.school_level);
      setGameFormCategory(editingGame.category);
      setGameFormLevel(editingGame.level);
      setGameFormRaceType(editingGame.race_type || '');
      setGameFormChampionshipId(editingGame.championship_id || '');
    } else {
      setGameFormGender('boys');
      setGameFormSchoolLevel('primary_junior');
      setGameFormCategory('ball_games');
      setGameFormLevel('zone');
      setGameFormRaceType('');
      setGameFormChampionshipId('');
    }
  }, [editingGame]);

  useEffect(() => {
    if (editingGame || !gameDialog) return;
    const nextChampionshipId = championshipsForGameCategory[0]?.id || championships[0]?.id || '';
    if (!gameFormChampionshipId && nextChampionshipId) {
      setGameFormChampionshipId(nextChampionshipId);
      return;
    }
    if (gameFormChampionshipId && !championships.some((championship) => championship.id === gameFormChampionshipId)) {
      setGameFormChampionshipId(nextChampionshipId);
    }
  }, [editingGame, gameDialog, gameFormChampionshipId, championships, championshipsForGameCategory]);

  useEffect(() => {
    if (editingParticipant) {
      setParticipantFormGender(editingParticipant.gender);
      setParticipantFormGameId(editingParticipant.game_id);
      setParticipantFormChampionshipId(editingParticipant.game?.championship_id || '');
      setParticipantFormSchoolLevel(editingParticipant.game?.school_level === 'primary_junior' ? 'primary' : (editingParticipant.game?.school_level || 'primary'));
      setSelectedTeamId(editingParticipant.school_id);
      setParticipantSchoolInput(editingParticipant.school_name?.trim() || parseSchoolFromNotes(editingParticipant.notes));
    } else {
      setParticipantFormGender('boys');
      setParticipantFormChampionshipId('');
      setParticipantFormGameId('');
      setParticipantFormSchoolLevel('primary');
      setSelectedTeamId('');
      setParticipantSchoolInput('');
    }
  }, [editingParticipant]);

  useEffect(() => {
    if (!resultsCategoryFilter) { setResultsChampionshipId(''); return; }
    if (resultsChampionshipId && !championships.some(c => c.id === resultsChampionshipId && c.school_level === resultsCategoryFilter)) {
      setResultsChampionshipId(''); setFilterGame('all');
    }
  }, [resultsCategoryFilter, resultsChampionshipId, championships]);

  useEffect(() => {
    if (heatChampionshipId && !championships.some(c => c.id === heatChampionshipId)) {
      setHeatChampionshipId('');
      setHeatGameId('');
    }
  }, [heatChampionshipId, championships]);

  useEffect(() => {
    if (!participantFormChampionshipId) { setParticipantFormGameId(''); return; }
    // Auto-fill level from championship
    const champ = championships.find(c => c.id === participantFormChampionshipId);
    if (champ) {
      if (champ.school_level === 'primary_junior') {
        setParticipantFormSchoolLevel((current) => (current === 'primary' || current === 'junior_secondary' ? current : 'primary'));
      } else {
        setParticipantFormSchoolLevel(champ.school_level);
      }
    }
  }, [participantFormChampionshipId, championships]);

  useEffect(() => {
    if (!participantDialog) {
      setTeamSearchInput('');
      setTeamSearch('');
      setSelectedTeamId('');
    }
  }, [participantDialog]);

  useEffect(() => {
    if (!heatParticipantDialog) {
      setHpHeatId('');
      setHpParticipantName('');
      setHeatTeamSearch('');
      setHeatSelectedTeamId('');
      setHeatSchoolSearch('');
    }
  }, [heatParticipantDialog]);

  // Auto-fill game level from championship in game form
  useEffect(() => {
    if (gameFormChampionshipId && gameFormChampionshipId !== 'none') {
      const champ = championships.find(c => c.id === gameFormChampionshipId);
      if (champ) {
        setGameFormLevel(champ.level);
      }
    }
  }, [gameFormChampionshipId, championships]);

  useEffect(() => {
    if (!resultsChampionshipId) { setFilterGame('all'); return; }
    if (filterGame !== 'all' && !filteredGamesForResults.find(g => g.id === filterGame)) setFilterGame('all');
  }, [resultsChampionshipId, filterGame, filteredGamesForResults]);

  useEffect(() => {
    if (!heatChampionshipId) { setHeatGameId(''); return; }
    if (heatGameId && !games.find(g => g.id === heatGameId && g.championship_id === heatChampionshipId)) setHeatGameId('');
  }, [heatChampionshipId, heatGameId, games]);

  useEffect(() => {
    if (editingHeatParticipant) {
      setHpQualifiedForFinal(!!editingHeatParticipant.is_qualified_for_final);
      setEditHpPositionInput(
        editingHeatParticipant.position != null ? String(editingHeatParticipant.position) : ''
      );
      return;
    }
    setHpQualifiedForFinal(false);
    setEditHpPositionInput('');
  }, [editingHeatParticipant]);

  useEffect(() => {
    if (editingSchool) {
      setSchoolFormChampionshipId(getTeamChampionshipId(editingSchool));
      setSchoolFormLevel(getTeamCompetitionLevel(editingSchool) || 'zone');
      return;
    }
    setSchoolFormChampionshipId('');
    setSchoolFormLevel('zone');
  }, [editingSchool]);

  useEffect(() => {
    if (editingSchool || !schoolDialog) return;
    if (!schoolFormChampionshipId && championships.length > 0) {
      setSchoolFormChampionshipId(championships[0].id);
    }
  }, [editingSchool, schoolDialog, schoolFormChampionshipId, championships]);

  useEffect(() => {
    if (editingChampionship) {
      setChampionshipNameInput(stripChampionshipLevelSuffix(editingChampionship.name));
      return;
    }
    if (championshipDialog) {
      setChampionshipNameInput('');
    }
  }, [editingChampionship, championshipDialog]);

  // Removed championship-based team filtering logic - all teams are now shown

  const handleLogout = () => { logout(); navigate('/'); };

  const handleSaveGame = async (formData: FormData) => {
    const maxQ = parseInt(formData.get('max_qualifiers') as string);
    const scheduledDate = (formData.get('scheduled_date') as string || '').trim();
    const data = {
      name: formData.get('name') as string,
      category: gameFormCategory,
      level: gameFormLevel,
      gender: gameFormGender,
      school_level: gameFormSchoolLevel,
      description: formData.get('description') as string || undefined,
      is_timed: formData.get('is_timed') === 'true',
      max_qualifiers: isNaN(maxQ) || maxQ < 1 ? 5 : maxQ,
      race_type: gameFormRaceType || null,
      championship_id: gameFormChampionshipId && gameFormChampionshipId !== 'none' ? gameFormChampionshipId : null,
      scheduled_date: scheduledDate || null,
    };
    try {
      if (editingGame) {
        await updateGame.mutateAsync({ id: editingGame.id, ...data });
        toast.success('Game updated');
      } else {
        await createGame.mutateAsync(data as any);
        toast.success('Game created');
      }
      setGameDialog(false);
      setEditingGame(null);
    } catch { toast.error('Failed to save game'); }
  };

  const handleSaveSchool = async (formData: FormData) => {
    const name = (formData.get('name') as string).trim();
    const selectedLevel = normalizeCompetitionLevel(formData.get('competition_level') as string) || schoolFormLevel;
    const selectedChampionshipId = (formData.get('championship_id') as string || schoolFormChampionshipId).trim();
    if (!selectedChampionshipId) {
      toast.error('Please select a championship');
      return;
    }

    const data = {
      name,
      zone: encodeTeamMetaForZone(selectedChampionshipId, selectedLevel),
      subcounty: editingSchool?.subcounty || '',
      county: editingSchool?.county || '',
      region: editingSchool?.region || '',
      country: editingSchool?.country || 'Kenya',
    };
    try {
      if (editingSchool) {
        await updateSchool.mutateAsync({ id: editingSchool.id, ...data });
        toast.success('Team updated');
      } else {
        await createSchool.mutateAsync(data);
        toast.success('Team created');
      }
      setSchoolDialog(false);
      setEditingSchool(null);
    } catch { toast.error('Failed to save team'); }
  };

  const handleSaveParticipant = async (formData: FormData) => {
    const schoolId = selectedTeamId;
    const championshipId = participantFormChampionshipId;
    const selectedGender = participantFormGender;
    
    if (!schoolId) { toast.error('Please select a team'); return; }
    if (!championshipId) { toast.error('Please select a championship'); return; }
    if (!participantFormGameId) { toast.error('Please select a game'); return; }

    const fullName = (formData.get('full_name') as string || '').trim();
    if (!fullName) { toast.error('Please enter a participant name'); return; }
    const nameParts = fullName.split(/\s+/);
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ').trim() || firstName;

    const timeInput = formData.get('time_taken') as string;
    const timeTaken = timeInput ? parseTimeInput(timeInput) : undefined;
    const position = formData.get('position') ? parseInt(formData.get('position') as string) : undefined;
    const autoPoints = getPointsForPosition(position);

    // Auto-qualify based on max_qualifiers
    const selectedGame = games.find(g => g.id === participantFormGameId);
    const maxQ = selectedGame?.max_qualifiers || 999;
    const autoQualify = position != null && position <= maxQ;

    const dob = (formData.get('date_of_birth') as string || '').trim();
    const bibInput = (formData.get('bib_number') as string || '').trim();

    const data: any = {
      first_name: firstName,
      last_name: lastName,
      school_id: schoolId,
      game_id: participantFormGameId,
      gender: selectedGender as Gender,
      school_name: participantSchoolInput.trim() || undefined,
      time_taken: timeTaken ?? undefined,
      position,
      score: autoPoints ?? (formData.get('score') ? parseFloat(formData.get('score') as string) : undefined),
      is_qualified: autoQualify || formData.get('is_qualified') === 'true',
      notes: participantSchoolInput.trim() ? `school:${participantSchoolInput.trim()}` : undefined,
      date_of_birth: dob || null,
      bib_number: bibInput || null,
    };

    try {
      let result: any;
      if (editingParticipant) {
        result = await updateParticipant.mutateAsync({ id: editingParticipant.id, ...data } as any);
      } else {
        result = await createParticipant.mutateAsync(data as any);
      }

      await queryClient.invalidateQueries({ queryKey: ['participants'] });

      toast.success(`Result recorded${autoQualify ? ' (auto-qualified)' : ''}`);
      setParticipantDialog(false);
      setEditingParticipant(null);
    } catch (error: any) {
      toast.error(`Failed to save: ${error?.message || 'Unknown error'}`);
    }
  };

  const handleDelete = async () => {
    if (!deleteDialog) return;
    try {
      const { type, id } = deleteDialog;
      if (type === 'game') await deleteGame.mutateAsync(id);
      else if (type === 'school') await deleteSchool.mutateAsync(id);
      else if (type === 'participant') await deleteParticipant.mutateAsync(id);
      else if (type === 'championship') await deleteChampionship.mutateAsync(id);
      else if (type === 'circular') await deleteCircular.mutateAsync(id);
      else if (type === 'heat') await deleteHeat.mutateAsync(id);
      else if (type === 'heat_participant') await deleteHeatParticipant.mutateAsync(id);
      else if (type === 'match') await deleteMatchPool.mutateAsync(id);
      toast.success('Deleted successfully');
    } catch (error: any) {
      const message = String(error?.message || '').toLowerCase();
      if (deleteDialog.type === 'school' && (message.includes('foreign key') || message.includes('violates'))) {
        toast.error('Failed to delete team: linked to match records. Remove those first.');
      } else {
        toast.error('Failed to delete');
      }
    }
    setDeleteDialog(null);
  };

  const handleOpenQualifyDialog = (game: Game) => {
    setSelectedGameForQualify(game);
    const gameParticipants = participants.filter(p => p.game_id === game.id);
    setSelectedQualifiers(gameParticipants.filter(p => p.is_qualified).map(p => p.id));
    setQualifyDialog(true);
  };

  const handleSaveQualifiers = async () => {
    if (!selectedGameForQualify) return;
    try {
      await bulkUpdateQualified.mutateAsync({ gameId: selectedGameForQualify.id, qualifiedIds: selectedQualifiers });
      toast.success('Qualifiers updated');
      setQualifyDialog(false);
    } catch { toast.error('Failed to update qualifiers'); }
  };

  const handleSaveChampionship = async (formData: FormData) => {
    try {
      const data = {
        name: formatChampionshipName((formData.get('name') as string) || '', champLevel),
        school_level: champSchoolLevel,
        level: champLevel,
        location: formData.get('location') as string || undefined,
        start_date: formData.get('start_date') as string || undefined,
        end_date: formData.get('end_date') as string || undefined,
        description: formData.get('description') as string || undefined,
      };
      if (editingChampionship) {
        await updateChampionship.mutateAsync({ id: editingChampionship.id, ...data });
        toast.success('Championship updated');
      } else {
        const createPayload = tenant ? { ...data, tenant_id: tenant.id } : data;
        await createChampionship.mutateAsync(createPayload as any);
        toast.success('Championship created');
      }
      setChampionshipDialog(false);
      setEditingChampionship(null);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save championship');
    }
  };

  const handleSaveCircular = async (formData: FormData) => {
    try {
      let documentUrl: string | null = null;
      if (circularDocument) {
        const fileName = `circular_${Date.now()}_${circularDocument.name}`;
        try {
          const { data, error } = await supabase.storage.from('circulars').upload(fileName, circularDocument, { upsert: true });
          if (error) {
            devError('Circular upload error:', error);
            toast.error(`Document upload failed: ${error.message || error}`);
          } else if (data) {
            const { data: publicData } = supabase.storage.from('circulars').getPublicUrl(fileName);
            if (publicData?.publicUrl) {
              documentUrl = publicData.publicUrl;
            } else {
              // Fallback: try signed URL for private buckets (valid for short time)
              try {
                const { data: signedData, error: signedErr } = await supabase.storage.from('circulars').createSignedUrl(fileName, 60 * 60);
                if (signedErr) devWarn('createSignedUrl error:', signedErr);
                if (signedData?.signedUrl) documentUrl = signedData.signedUrl;
              } catch (signedEx) {
                devWarn('createSignedUrl exception:', signedEx);
              }
            }
          }
          } catch (uploadEx) {
          devError('Upload exception:', uploadEx);
          toast.error('Document upload failed');
        }
      }

      const circularData = {
        title: formData.get('title') as string,
        content: formData.get('content') as string,
        sender_name: formData.get('sender_name') as string,
        sender_role: formData.get('sender_role') as string || 'National Admin',
        target_level: circularLevel,
        is_published: true,
        document_url: documentUrl || editingCircular?.document_url || null,
      };

      if (editingCircular) {
        await updateCircular.mutateAsync({ id: editingCircular.id, ...circularData });
        toast.success('Circular updated');
      } else {
        await createCircular.mutateAsync(circularData);
        toast.success('Circular published');
      }
      setCircularDialog(false);
      setCircularDocument(null);
      setEditingCircular(null);
    } catch (err: any) {
      devError('Save circular failed:', err);
      toast.error(err?.message || 'Failed to publish circular');
      setCircularDocument(null);
    }
  };

  const handleCreateHeat = async (formData: FormData) => {
    const resolvedGameId = heatFormGameId || heatGameId;
    const parsedHeatNumber = parseInt(String(formData.get('heat_number') || ''), 10);
    const heatNumber = Number.isNaN(parsedHeatNumber) || parsedHeatNumber < 1 ? 1 : parsedHeatNumber;

    if (!resolvedGameId) {
      toast.error('Please select an athletics game before creating a heat');
      return;
    }

    const gameExists = games.some((g) => g.id === resolvedGameId);
    if (!gameExists) {
      toast.error('Selected game is invalid. Please reselect the game and try again.');
      return;
    }

    const duplicateHeat = heatsForGame.find(
      (h) => h.heat_type === heatFormType && h.heat_number === heatNumber
    );
    if (duplicateHeat) {
      toast.error(
        heatFormType === 'final'
          ? 'Final heat already exists for this game.'
          : `Heat ${heatNumber} already exists for this game.`
      );
      return;
    }

    try {
      await createHeat.mutateAsync({
        game_id: resolvedGameId,
        heat_number: heatNumber,
        heat_type: heatFormType,
      });
      toast.success('Heat created');
      setHeatDialog(false);
      setHeatFormType('heat');
    } catch (error: any) {
      devError('Create heat failed:', error);
      toast.error(error?.message || 'Failed to create heat');
    }
  };

  const handleAddHeatParticipant = async (formData: FormData) => {
    const fullName = hpParticipantName.trim();
    const teamId = heatSelectedTeamId;
    if (!hpHeatId) { toast.error('Please select a heat'); return; }
    if (!fullName) { toast.error('Please enter participant name'); return; }
    if (!teamId) { toast.error('Please select a team'); return; }

    const selectedHeat = heatsForGame.find((h) => h.id === hpHeatId);
    if (!selectedHeat) { toast.error('Selected heat not found'); return; }

    const isFinalHeat = selectedHeat.heat_type === 'final';
    const timeInput = formData.get('time_taken') as string;
    const timeTaken = timeInput ? parseTimeInput(timeInput) : undefined;
    const position = formData.get('position') ? parseInt(formData.get('position') as string) : undefined;
    const pointsToAward = getPointsForPosition(position) ?? 0;
    const isTopThree = position !== undefined && position <= 3;
    const qualifiesForFinalsFlag = isTopThree;
    const qualifiesForNextLevel = isFinalHeat && isTopThree;

    const nameParts = fullName.split(/\s+/);
    const firstName = nameParts[0] || fullName;
    const lastName = nameParts.slice(1).join(' ').trim() || firstName;

    const selectedSchool = schools.find((s) => s.id === teamId);
    const selectedGame = games.find((g) => g.id === heatGameId);
    if (!selectedGame) { toast.error('Select an athletics game first'); return; }

    try {
      const createdParticipant = await createParticipant.mutateAsync({
        first_name: firstName,
        last_name: lastName,
        school_id: teamId,
        school_name: heatSchoolSearch.trim() || selectedSchool?.name || undefined,
        game_id: selectedGame.id,
        gender: selectedGame.gender,
        notes: `heat_entry_name:${fullName}${heatSchoolSearch.trim() ? `|school:${heatSchoolSearch.trim()}` : ''}`,
      } as any);

      await addHeatParticipant.mutateAsync({
        heat_id: hpHeatId,
        participant_id: createdParticipant.id,
        time_taken: timeTaken ?? undefined,
        position,
        is_qualified_for_final: qualifiesForFinalsFlag,
      });

      toast.success(
        isFinalHeat
          ? `Added to final${qualifiesForNextLevel ? ' (auto-qualified for next level)' : ''}`
          : `Added to heat${qualifiesForFinalsFlag ? ' (auto-qualified for finals)' : ''}`
      );
      setHpParticipantName('');
      setHeatTeamSearch('');
      setHeatSelectedTeamId('');
      setHeatSchoolSearch('');
      setHpHeatId('');
      setHeatParticipantDialog(false);
    } catch (error: any) {
      devError('Heat participant error:', error);
      toast.error(`Failed: ${error?.message || 'Unknown error'}`);
    }
  };

  const handlePostToFinals = async () => {
    if (!heatGameId) return;
    let finalHeat = heatsForGame.find(h => h.heat_type === 'final');
    if (!finalHeat) {
      try {
        finalHeat = await createHeat.mutateAsync({ game_id: heatGameId, heat_number: 1, heat_type: 'final' });
      } catch { toast.error('Failed to create final heat'); return; }
    }
    const qualifiedHPs = allHeatParticipants.filter(hp => hp.heat?.heat_type !== 'final' && hp.is_qualified_for_final);
    if (qualifiedHPs.length === 0) { toast.error('No qualified participants to post to finals'); return; }
    const finalsParticipantIds = allHeatParticipants.filter(hp => hp.heat_id === finalHeat!.id).map(hp => hp.participant_id);
    const toAdd = qualifiedHPs.filter(hp => !finalsParticipantIds.includes(hp.participant_id));
    if (toAdd.length === 0) { toast.info('All qualified participants are already in finals'); return; }
    try {
      for (const hp of toAdd) {
        await addHeatParticipant.mutateAsync({ heat_id: finalHeat!.id, participant_id: hp.participant_id, is_qualified_for_final: false });
      }
      toast.success(`${toAdd.length} participant(s) posted to finals`);
    } catch { toast.error('Failed to post to finals'); }
  };

  const handleCreateMatch = async (formData: FormData) => {
    try {
      if (editingMatchId) {
        await updateMatchPool.mutateAsync({
          id: editingMatchId,
          team_a_score: formData.get('team_a_score') ? parseInt(formData.get('team_a_score') as string) : undefined,
          team_b_score: formData.get('team_b_score') ? parseInt(formData.get('team_b_score') as string) : undefined,
          winner_school_id: formData.get('winner') as string || undefined,
          notes: formData.get('notes') as string || undefined,
        });
        toast.success('Match updated');
      } else {
        await createMatchPool.mutateAsync({
          game_id: matchFormGameId,
          round_name: formData.get('round_name') as string || 'Round 1',
          team_a_school_id: matchTeamA || undefined,
          team_b_school_id: matchTeamB || undefined,
        });
        toast.success('Match created');
      }
      setMatchDialog(false);
      setEditingMatchId('');
    } catch { toast.error('Failed to save match'); }
  };

  // Auto-generate round-robin matches for a ball game from teams in its championship.
  const handleAutoPool = async () => {
    if (!matchGameId) { toast.error('Select a ball game first'); return; }
    const game = games.find(g => g.id === matchGameId);
    if (!game) { toast.error('Game not found'); return; }
    if (game.category !== 'ball_games') { toast.error('Auto-pooling is only for ball games'); return; }
    const champId = game.championship_id;
    if (!champId) { toast.error('Game must belong to a championship'); return; }

    // Teams = schools whose tournament metadata matches this championship.
    const teams = schools.filter(s => getTeamChampionshipId(s) === champId);
    if (teams.length < 2) { toast.error('Add at least 2 teams to this championship first'); return; }
    if (matchPoolsForGame.length > 0) {
      const ok = window.confirm(`This game already has ${matchPoolsForGame.length} match(es). Add round-robin pairings on top?`);
      if (!ok) return;
    }

    try {
      // Round-robin: every team plays every other team once.
      let round = 1;
      let created = 0;
      for (let i = 0; i < teams.length; i++) {
        for (let j = i + 1; j < teams.length; j++) {
          await createMatchPool.mutateAsync({
            game_id: matchGameId,
            round_name: `Round ${round}`,
            team_a_school_id: teams[i].id,
            team_b_school_id: teams[j].id,
          });
          created++;
          if (created % Math.max(1, teams.length - 1) === 0) round++;
        }
      }
      toast.success(`Auto-pooled ${created} match${created === 1 ? '' : 'es'} across ${teams.length} teams`);
    } catch (e: any) {
      toast.error(e?.message || 'Auto-pool failed');
    }
  };

  // Filtered games with category + gender + search + championship
  const filteredGames = useMemo(() => {
    let result = games;
    if (gamesChampionshipFilter) result = result.filter(g => g.championship_id === gamesChampionshipFilter);
    if (filterCategory !== 'all') result = result.filter(g => g.category === filterCategory);
    if (filterGender !== 'all') result = result.filter(g => g.gender === filterGender);
    if (gameSearchText.trim()) {
      const search = gameSearchText.toLowerCase();
      result = result.filter(g => g.name.toLowerCase().includes(search));
    }
    return result;
  }, [games, gamesChampionshipFilter, filterCategory, filterGender, gameSearchText]);

  const filteredParticipants = useMemo(() => {
    // When no championship is selected for results, show all participants across championships.
    let result = participants;
    if (resultsChampionshipId) {
      result = result.filter(p => p.game?.championship_id === resultsChampionshipId);
    }
    if (filterGame !== 'all') result = result.filter(p => p.game_id === filterGame);
    return result;
  }, [participants, resultsChampionshipId, filterGame]);

  const filteredSchoolsForParticipant = useMemo(() => {
    if (!participantFormChampionshipId) return schools;
    const schoolIds = new Set(
      participants
        .filter((p) => p.game?.championship_id === participantFormChampionshipId)
        .map((p) => p.school_id)
    );
    return schools.filter((school) => schoolIds.has(school.id));
  }, [schools, participants, participantFormChampionshipId]);

  // All teams filtered by search only (NO championship filtering)
  const allTeamsFiltered = useMemo(() => {
    const search = teamSearch.trim().toLowerCase();
    if (!search) return schools;
    return schools.filter((school) =>
      school.name.toLowerCase().includes(search)
    );
  }, [schools, teamSearch]);

  // Filtered heat teams by search text only
  const filteredHeatTeams = useMemo(() => {
    if (!heatChampionshipId) {
      return schools.filter((s) =>
        heatTeamSearch.trim() === '' ||
        s.name.toLowerCase().includes(heatTeamSearch.toLowerCase())
      );
    }

    const champGameIds = games
      .filter((g) => g.championship_id === heatChampionshipId)
      .map((g) => g.id);

    const champGameIdSet = new Set(champGameIds);
    const champSchoolIds = new Set(
      participants
        .filter((p) => champGameIdSet.has(p.game_id))
        .map((p) => p.school_id)
        .filter(Boolean)
    );

    const champSchools = schools.filter((s) => champSchoolIds.has(s.id));

    devLog('Champ game ids:', champGameIds);
    devLog('Champ school ids:', [...champSchoolIds]);
    devLog('Champ schools:', champSchools);

    const teamsToSearch = champSchools.length > 0 ? champSchools : schools;

    return teamsToSearch.filter((s) =>
      heatTeamSearch.trim() === '' ||
      s.name.toLowerCase().includes(heatTeamSearch.toLowerCase())
    );
  }, [heatsForGame, schools, heatTeamSearch, heatsGames]);

  const filteredSchools = useMemo(() => {
    if (!teamsChampionshipFilter) return schools;
    return schools.filter((school) => getTeamChampionshipId(school) === teamsChampionshipFilter);
  }, [schools, teamsChampionshipFilter]);

  const selectedTeamsChampionship = useMemo(
    () => championships.find((c) => c.id === teamsChampionshipFilter) || null,
    [championships, teamsChampionshipFilter],
  );

  const getChampionshipName = (championshipId?: string) => {
    if (!championshipId) return null;
    return championships.find(c => c.id === championshipId)?.name || null;
  };

  const getTeamChampionshipName = (school: School) => {
    return getChampionshipName(getTeamChampionshipId(school)) || '-';
  };

  if (authLoading) return <div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-secondary" /></div>;
  if (!isAdmin) return null;

  const isLoading = gamesLoading || schoolsLoading || participantsLoading;
  const selectedHeatGame = games.find(g => g.id === heatGameId);
  
  // Debug logs for heats tab
  useEffect(() => {
    devLog('=== HEATS TAB DEBUG ===')
    devLog('heatChampionshipId:', heatChampionshipId)
    devLog('heatGameId:', heatGameId)
    devLog('selectedHeatGame:', selectedHeatGame)
    devLog('heatsGames (filtered for championship):', heatsGames.length, heatsGames)
    devLog('heatsForGame fetched:', heatsForGame.length, heatsForGame)
    devLog('allHeatParticipants:', allHeatParticipants.length)
  }, [heatChampionshipId, heatGameId, selectedHeatGame, heatsGames, heatsForGame, allHeatParticipants]);

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-gradient-navy text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/20 shadow-lg overflow-hidden">
                <img
                  src="/zaroda-logo.png"
                  alt="Zaroda Sports Management"
                  className="h-full w-full object-cover"
                />
              </div>
              <div>
                <h1 className="font-display text-2xl tracking-wider">ADMIN DASHBOARD</h1>
                <p className="text-primary-foreground/70 text-sm">Zaroda Sports Management</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" onClick={() => navigate('/')}><Home className="w-4 h-4 mr-1" />View Site</Button>
              <Button variant="secondary" size="sm" onClick={() => navigate('/rankings')}><BarChart3 className="w-4 h-4 mr-1" />Rankings</Button>
              <Button variant="secondary" size="sm" onClick={() => navigate('/call-room')}><CheckCircle2 className="w-4 h-4 mr-1" />Call Room</Button>
              <Button variant="secondary" size="sm" onClick={() => navigate('/bib-ranges')}><Hash className="w-4 h-4 mr-1" />Bib Ranges</Button>
              <Button variant="secondary" size="sm" onClick={() => navigate('/pricing')}><Sparkles className="w-4 h-4 mr-1" />Subscribe / Upgrade Level</Button>
              <Button variant="destructive" size="sm" onClick={handleLogout}><LogOut className="w-4 h-4 mr-1" />Logout</Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {(() => {
          const operationalTabs = ['games', 'participants', 'schools', 'heats', 'bibs', 'pooling'];
          const inChampionshipWorkspace = operationalTabs.includes(activeTab) || activeTab === 'championships';
          // Stat cards only show inside a championship workspace (operational tabs).
          // For level admins (tenants) they always show — that is their working dashboard.
          const showOperationalStats = !isSuperAdmin || operationalTabs.includes(activeTab);

          return (
        <>
        {showOperationalStats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-secondary/10 rounded-lg flex items-center justify-center"><Target className="w-5 h-5 text-secondary" /></div>
              <div><p className="text-muted-foreground text-sm">Games</p><p className="text-2xl font-display">{games.length}</p></div>
            </div>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-secondary/10 rounded-lg flex items-center justify-center"><Users className="w-5 h-5 text-secondary" /></div>
              <div><p className="text-muted-foreground text-sm">Participants</p><p className="text-2xl font-display">{participants.length}</p></div>
            </div>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-secondary/10 rounded-lg flex items-center justify-center"><MapPin className="w-5 h-5 text-secondary" /></div>
              <div><p className="text-muted-foreground text-sm">Teams</p><p className="text-2xl font-display">{schools.length}</p></div>
            </div>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-secondary/10 rounded-lg flex items-center justify-center"><Trophy className="w-5 h-5 text-secondary" /></div>
              <div><p className="text-muted-foreground text-sm">Qualified</p><p className="text-2xl font-display">{participants.filter(p => p.is_qualified).length}</p></div>
            </div>
          </div>
        </div>
        )}

        {isLoading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-secondary" /></div>
        ) : (
          <div>
            {isSuperAdmin && (
              <nav className="bg-card border border-border rounded-xl p-2 mb-4 flex flex-wrap gap-1">
                <Button variant={activeTab === 'overview' ? 'secondary' : 'ghost'} size="sm" onClick={() => setActiveTab('overview')}><LayoutDashboard className="w-4 h-4 mr-2" />Dashboard</Button>
                <Button variant={inChampionshipWorkspace ? 'secondary' : 'ghost'} size="sm" onClick={() => setActiveTab('championships')}><Award className="w-4 h-4 mr-2" />Championships</Button>
                <Button variant={activeTab === 'tenants' ? 'secondary' : 'ghost'} size="sm" onClick={() => setActiveTab('tenants')}><Building2 className="w-4 h-4 mr-2" />Tenants</Button>
                <Button variant={activeTab === 'create-admin' ? 'secondary' : 'ghost'} size="sm" onClick={() => setActiveTab('create-admin')}><UserCog className="w-4 h-4 mr-2" />Create Admin</Button>
                <Button variant={activeTab === 'messages' ? 'secondary' : 'ghost'} size="sm" onClick={() => setActiveTab('messages')}><MessageSquare className="w-4 h-4 mr-2" />Messages</Button>
                <Button variant={activeTab === 'circulars' ? 'secondary' : 'ghost'} size="sm" onClick={() => setActiveTab('circulars')}><FileText className="w-4 h-4 mr-2" />Circulars</Button>
                <Button variant={activeTab === 'open-tournament' ? 'secondary' : 'ghost'} size="sm" onClick={() => setActiveTab('open-tournament')}><DollarSign className="w-4 h-4 mr-2" />Tournament Fees</Button>
                <Button variant={activeTab === 'my-championships' ? 'secondary' : 'ghost'} size="sm" onClick={() => setActiveTab('my-championships')}><Crown className="w-4 h-4 mr-2" />My Championships</Button>
              </nav>
            )}

            {/* Operational toolbar — only inside the Championship workspace (super admin). */}
            {isSuperAdmin && inChampionshipWorkspace && (
              <div className="bg-muted rounded-xl p-2 mb-4 flex flex-wrap items-center gap-1">
                <span className="text-xs font-medium text-muted-foreground px-2 flex items-center gap-1"><Award className="w-3.5 h-3.5" />Championship tools:</span>
                <Button variant={activeTab === 'championships' ? 'default' : 'ghost'} size="sm" onClick={() => setActiveTab('championships')}>Manage</Button>
                <Button variant={activeTab === 'games' ? 'default' : 'ghost'} size="sm" onClick={() => setActiveTab('games')}><Target className="w-4 h-4 mr-1" />Games</Button>
                <Button variant={activeTab === 'participants' ? 'default' : 'ghost'} size="sm" onClick={() => setActiveTab('participants')}><Users className="w-4 h-4 mr-1" />Record Results</Button>
                <Button variant={activeTab === 'schools' ? 'default' : 'ghost'} size="sm" onClick={() => setActiveTab('schools')}><MapPin className="w-4 h-4 mr-1" />Teams</Button>
                <Button variant={activeTab === 'heats' ? 'default' : 'ghost'} size="sm" onClick={() => setActiveTab('heats')}><Timer className="w-4 h-4 mr-1" />Heats</Button>
                <Button variant={activeTab === 'bibs' ? 'default' : 'ghost'} size="sm" onClick={() => setActiveTab('bibs')}><Hash className="w-4 h-4 mr-1" />Bibs &amp; Seeding</Button>
                <Button variant={activeTab === 'pooling' ? 'default' : 'ghost'} size="sm" onClick={() => setActiveTab('pooling')}><Swords className="w-4 h-4 mr-1" />Pooling</Button>
              </div>
            )}

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            {!isSuperAdmin && (
            <TabsList className="bg-muted flex-wrap h-auto gap-1">
              <TabsTrigger value="games" className="gap-1"><Target className="w-4 h-4" />Games</TabsTrigger>
              <TabsTrigger value="participants" className="gap-1"><Users className="w-4 h-4" />Record Results</TabsTrigger>
              <TabsTrigger value="schools" className="gap-1"><MapPin className="w-4 h-4" />Teams</TabsTrigger>
              <TabsTrigger value="heats" className="gap-1"><Timer className="w-4 h-4" />Heats</TabsTrigger>
              <TabsTrigger value="bibs" className="gap-1"><Hash className="w-4 h-4" />Bibs &amp; Seeding</TabsTrigger>
              <TabsTrigger value="pooling" className="gap-1"><Swords className="w-4 h-4" />Pooling</TabsTrigger>
              <TabsTrigger value="championships" className="gap-1"><Award className="w-4 h-4" />Championships</TabsTrigger>
              <TabsTrigger value="circulars" className="gap-1"><FileText className="w-4 h-4" />Circulars</TabsTrigger>
              <TabsTrigger value="open-tournament" className="gap-1"><DollarSign className="w-4 h-4" />Tournament Fees</TabsTrigger>
              <TabsTrigger value="messages" className="gap-1"><MessageSquare className="w-4 h-4" />Messages</TabsTrigger>
            </TabsList>
            )}

            {isSuperAdmin && (
              <TabsContent value="overview" className="space-y-4">
                <SuperAdminOverview />
              </TabsContent>
            )}


            <TabsContent value="open-tournament" className="space-y-4">
              <OpenTournamentPanel scopedChampionshipId={isSuperAdmin ? null : championshipId} />
            </TabsContent>

            <TabsContent value="messages" className="space-y-4">
              <MessagesPanel />
            </TabsContent>

            {isSuperAdmin && (
              <TabsContent value="my-championships" className="space-y-4">
                <SuperAdminMyChampionshipsPanel />
              </TabsContent>
            )}

            {isSuperAdmin && (
              <TabsContent value="tenants" className="space-y-4">
                <SuperAdminTenantsPanel />
              </TabsContent>
            )}

            {isSuperAdmin && (
              <TabsContent value="create-admin" className="space-y-4">
                <AdminManagementPanel />
              </TabsContent>
            )}

            {/* ===== GAMES TAB ===== */}
            <TabsContent value="games" className="space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative flex-1 min-w-[200px] max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search games..."
                    value={gameSearchInput}
                    onChange={(e) => {
                      const value = e.target.value;
                      setGameSearchInput(value);
                      debouncedSetGameSearchText(value);
                    }}
                    className="pl-9"
                  />
                </div>
                <Select value={gamesChampionshipFilter || 'all'} onValueChange={(v) => setGamesChampionshipFilter(v === 'all' ? '' : v)}>
                  <SelectTrigger className="w-56"><SelectValue placeholder="Championship" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Championships</SelectItem>
                    {championships.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={filterCategory} onValueChange={(v) => setFilterCategory(v as GameCategory | 'all')}>
                  <SelectTrigger className="w-40"><SelectValue placeholder="Category" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="ball_games">Ball Games</SelectItem>
                    <SelectItem value="athletics">Athletics</SelectItem>
                    <SelectItem value="music">Music</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filterGender} onValueChange={(v) => setFilterGender(v as Gender | 'all')}>
                  <SelectTrigger className="w-32"><SelectValue placeholder="Gender" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Gender</SelectItem>
                    <SelectItem value="boys">Boys</SelectItem>
                    <SelectItem value="girls">Girls</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={() => { setEditingGame(null); setGameDialog(true); }} className="ml-auto"><Plus className="w-4 h-4 mr-1" />Add Game</Button>
              </div>
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>Name</TableHead>
                      <TableHead>Championship</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Level</TableHead>
                      <TableHead>Gender</TableHead>
                      <TableHead>School Level</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredGames.length === 0 ? (
                      <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No games found</TableCell></TableRow>
                    ) : filteredGames.map(game => (
                      <TableRow key={game.id}>
                        <TableCell className="font-medium">{game.name}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{getChampionshipName(game.championship_id) || '-'}</TableCell>
                        <TableCell><Badge variant="outline">{CATEGORY_LABELS[game.category]}</Badge></TableCell>
                        <TableCell><Badge variant="secondary">{LEVEL_LABELS[game.level]}</Badge></TableCell>
                        <TableCell><Badge variant="outline" className={game.gender === 'boys' ? 'border-blue-400 text-blue-600' : 'border-pink-400 text-pink-600'}>{GENDER_LABELS[game.gender]}</Badge></TableCell>
                        <TableCell><Badge variant="outline">{SCHOOL_LEVEL_LABELS[game.school_level]}</Badge></TableCell>
                        <TableCell>
                          {game.race_type === 'field_event' ? 'Field Event' : game.is_timed ? <span className="flex items-center gap-1 text-sm"><Clock className="w-3 h-3" />Timed</span> : game.race_type ? RACE_TYPE_LABELS[game.race_type] || game.race_type : 'Standard'}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {game.is_timed && <Button variant="outline" size="sm" onClick={() => rankByTime.mutateAsync(game.id).then(() => toast.success('Ranked'))}><Timer className="w-3 h-3 mr-1" />Rank</Button>}
                            <Button variant="outline" size="sm" onClick={() => handleOpenQualifyDialog(game)}><CheckCircle2 className="w-3 h-3 mr-1" />Qualify</Button>
                            <Button variant="ghost" size="icon" onClick={() => { setEditingGame(game); setGameDialog(true); }}><Pencil className="w-4 h-4" /></Button>
                            <Button variant="ghost" size="icon" onClick={() => setDeleteDialog({ type: 'game', id: game.id })}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            {/* ===== RECORD RESULTS TAB ===== */}
            <TabsContent value="participants" className="space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <Select value={resultsCategoryFilter} onValueChange={(value) => { setResultsCategoryFilter(value as SchoolLevel); setResultsChampionshipId(''); setFilterGame('all'); }}>
                  <SelectTrigger className="w-56"><SelectValue placeholder="Category" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="base">Base</SelectItem>
                    <SelectItem value="primary">Primary</SelectItem>
                    <SelectItem value="junior_secondary">Junior Secondary</SelectItem>
                    <SelectItem value="primary_junior">Primary/Junior School</SelectItem>
                    <SelectItem value="senior_secondary">Senior Secondary</SelectItem>
                    <SelectItem value="tertiary">Tertiary</SelectItem>
                    <SelectItem value="open">Open Tournament</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={resultsChampionshipId} onValueChange={setResultsChampionshipId}>
                  <SelectTrigger className="w-72" disabled={!resultsCategoryFilter}><SelectValue placeholder={resultsCategoryFilter ? 'Select championship' : 'Select category first'} /></SelectTrigger>
                  <SelectContent>
                    {championshipsForResultsCategory.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                {resultsChampionshipId && (
                  <Select value={filterGame} onValueChange={setFilterGame}>
                    <SelectTrigger className="w-80"><SelectValue placeholder="Filter by game" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Games</SelectItem>
                      {filteredGamesForResults.map(g => <SelectItem key={g.id} value={g.id}>{g.name} ({LEVEL_LABELS[g.level]})</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
                {resultsChampionshipId && (
                  <Button className="ml-auto" onClick={() => {
                    setEditingParticipant(null);
                    setParticipantFormChampionshipId(resultsChampionshipId);
                    setParticipantFormSchoolLevel(selectedResultsChampionship?.school_level === 'primary_junior' ? 'primary' : (selectedResultsChampionship?.school_level || 'primary'));
                    setParticipantFormGameId('');
                    setParticipantDialog(true);
                  }}>
                    <Plus className="w-4 h-4 mr-1" />Record Result
                  </Button>
                )}
              </div>

              {!resultsChampionshipId ? (
                <div className="text-center py-8 text-muted-foreground">Please select category and championship to view or record results</div>
              ) : (
                <div className="bg-card border border-border rounded-xl overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead>Name</TableHead><TableHead>Team</TableHead><TableHead>School</TableHead>
                        <TableHead>Game</TableHead><TableHead>Pos</TableHead><TableHead>Points</TableHead><TableHead>Time</TableHead>
                        <TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredParticipants.length === 0 ? (
                        <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">No results recorded</TableCell></TableRow>
                      ) : filteredParticipants.map(p => (
                        <TableRow key={p.id}>
                          <TableCell className="font-medium">{p.first_name} {p.last_name}</TableCell>
                          <TableCell>{p.school?.name || '-'}</TableCell>
                          <TableCell>{p.school_name?.trim() || parseSchoolFromNotes(p.notes) || '-'}</TableCell>
                          <TableCell><Badge variant="outline">{p.game?.name}</Badge></TableCell>
                          <TableCell>{p.position || '-'}</TableCell>
                          <TableCell className="font-semibold">{p.score ?? '-'}</TableCell>
                          <TableCell className="font-mono">{p.time_taken ? formatTimeDisplay(p.time_taken) : '-'}</TableCell>
                          <TableCell>{p.is_qualified ? <Badge className="bg-success text-success-foreground">Qualified</Badge> : <Badge variant="outline">Pending</Badge>}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="icon" onClick={() => { setEditingParticipant(p); setParticipantDialog(true); }}><Pencil className="w-4 h-4" /></Button>
                              <Button variant="ghost" size="icon" onClick={() => setDeleteDialog({ type: 'participant', id: p.id })}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>

            {/* ===== TEAMS TAB ===== */}
            <TabsContent value="schools" className="space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <Select value={teamsChampionshipFilter || 'all'} onValueChange={(v) => setTeamsChampionshipFilter(v === 'all' ? '' : v)}>
                  <SelectTrigger className="w-72"><SelectValue placeholder="Championship" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Championships</SelectItem>
                    {championships.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>

                {selectedTeamsChampionship && (
                  <Badge variant="outline">
                    Showing teams for {selectedTeamsChampionship.name}
                  </Badge>
                )}

                <Button className="ml-auto" onClick={() => { setEditingSchool(null); setSchoolDialog(true); }}><Plus className="w-4 h-4 mr-1" />Add Team</Button>
              </div>
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>Team Name</TableHead>
                      <TableHead>Championship</TableHead>
                      <TableHead>Competition Level</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSchools.length === 0 ? (
                      <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No teams for selected championship</TableCell></TableRow>
                    ) : filteredSchools.map(s => {
                      const teamLevel = getTeamCompetitionLevel(s);
                      return (
                        <TableRow key={s.id}>
                          <TableCell className="font-medium flex items-center gap-2">
                            <span>{s.name}</span>
                            {teamLevel && <Badge variant="outline">{LEVEL_LABELS[teamLevel]}</Badge>}
                          </TableCell>
                          <TableCell>{getTeamChampionshipName(s)}</TableCell>
                          <TableCell>{teamLevel ? <Badge variant="secondary">{LEVEL_LABELS[teamLevel]}</Badge> : '-'}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="icon" onClick={() => { setEditingSchool(s); setSchoolDialog(true); }}><Pencil className="w-4 h-4" /></Button>
                              <Button variant="ghost" size="icon" onClick={() => setDeleteDialog({ type: 'school', id: s.id })}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            {/* ===== HEATS TAB ===== */}
            <TabsContent value="heats" className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <Select value={heatChampionshipId || 'all'} onValueChange={(value) => { setHeatChampionshipId(value === 'all' ? '' : value); setHeatGameId(''); }}>
                  <SelectTrigger className="w-72"><SelectValue placeholder="Select championship" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Championships</SelectItem>
                    {championships.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={heatGameId} onValueChange={setHeatGameId}>
                  <SelectTrigger className="w-80"><SelectValue placeholder="Select athletics game" /></SelectTrigger>
                  <SelectContent>
                    {heatsGames.map(g => <SelectItem key={g.id} value={g.id}>{g.name} ({GENDER_LABELS[g.gender]})</SelectItem>)}
                  </SelectContent>
                </Select>
                {selectedHeatGame && (
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{CATEGORY_LABELS[selectedHeatGame.category]}</Badge>
                    <Badge variant="outline" className={selectedHeatGame.gender === 'boys' ? 'border-blue-400 text-blue-600' : 'border-pink-400 text-pink-600'}>{GENDER_LABELS[selectedHeatGame.gender]}</Badge>
                    <Badge variant="outline">{SCHOOL_LEVEL_LABELS[selectedHeatGame.school_level]}</Badge>
                  </div>
                )}
                <div className="flex gap-2 ml-auto">
                  <Button onClick={() => { setHeatFormGameId(heatGameId); setHeatDialog(true); }} disabled={!heatGameId}><Plus className="w-4 h-4 mr-1" />Add Heat</Button>
                  <Button variant="outline" onClick={() => { setHpHeatId(''); setHpParticipantName(''); setHeatTeamSearch(''); setHeatSelectedTeamId(''); setHeatSchoolSearch(''); setHeatParticipantDialog(true); }} disabled={!heatGameId}><Plus className="w-4 h-4 mr-1" />Add to Heat</Button>
                  <Button variant="secondary" onClick={handlePostToFinals} disabled={!heatGameId}><Award className="w-4 h-4 mr-1" />Qualify to Finals</Button>
                </div>
              </div>
              {heatsForGame.length > 0 ? (
                <div className="space-y-4">
                  {heatsForGame.map(heat => {
                    const displayedHeatParticipants = allHeatParticipants?.filter(hp => hp.heat_id === heat.id) || [];
                    devLog('Heat participants for display:', displayedHeatParticipants);
                    const hps = [...displayedHeatParticipants].sort((a, b) => (a.position || 99) - (b.position || 99));
                    return (
                      <div key={heat.id} className="bg-card border border-border rounded-xl overflow-hidden">
                        <div className="bg-muted/50 px-4 py-3 flex items-center justify-between">
                          <h3 className="font-display text-lg">{heat.heat_type === 'final' ? '🏆 FINAL' : `Heat ${heat.heat_number}`}</h3>
                          <Button variant="ghost" size="icon" onClick={() => setDeleteDialog({ type: 'heat', id: heat.id })}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                        </div>
                        <Table>
                          <TableHeader>
                            <TableRow><TableHead>Pos</TableHead><TableHead>Points</TableHead><TableHead>Name</TableHead><TableHead>Team</TableHead><TableHead>Time</TableHead><TableHead>Finals?</TableHead><TableHead className="text-right">Actions</TableHead></TableRow>
                          </TableHeader>
                          <TableBody>
                            {hps.length === 0 ? (
                              <TableRow><TableCell colSpan={7} className="text-center py-4 text-muted-foreground">Empty heat</TableCell></TableRow>
                            ) : hps.map(hp => (
                              <TableRow key={hp.id}>
                                <TableCell>{hp.position || '-'}</TableCell>
                                <TableCell className="font-semibold">{heat.heat_type === 'final' ? (getPointsForPosition(hp.position) ?? '-') : 0}</TableCell>
                                <TableCell className="font-medium">{hp.participant?.first_name} {hp.participant?.last_name}</TableCell>
                                <TableCell>{hp.participant?.school?.name || '-'}</TableCell>
                                <TableCell className="font-mono">{hp.time_taken ? formatTimeDisplay(hp.time_taken) : '-'}</TableCell>
                                <TableCell>{hp.is_qualified_for_final ? <Badge className="bg-success text-success-foreground">Finals ✓</Badge> : '-'}</TableCell>
                                <TableCell className="text-right">
                                  <div className="flex items-center justify-end gap-1">
                                    <Button variant="ghost" size="icon" onClick={() => { setEditingHeatParticipant(hp); setEditHpDialog(true); }}><Pencil className="w-4 h-4" /></Button>
                                    <Button variant="ghost" size="icon" onClick={() => setDeleteDialog({ type: 'heat_participant', id: hp.id })}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">{heatGameId ? 'No heats yet. Create one!' : 'Select an athletics game'}</div>
              )}
            </TabsContent>

            {/* ===== BIBS & SEEDING TAB ===== */}
            <TabsContent value="bibs" className="space-y-4">
              <BibSeedingPanel />
            </TabsContent>

            {/* ===== POOLING TAB ===== */}
            <TabsContent value="pooling" className="space-y-4">
              <div className="flex items-center justify-between">
                <Select value={matchGameId} onValueChange={setMatchGameId}>
                  <SelectTrigger className="w-60"><SelectValue placeholder="Select ball game" /></SelectTrigger>
                  <SelectContent>
                    {ballGames.map(g => <SelectItem key={g.id} value={g.id}>{g.name} ({GENDER_LABELS[g.gender]})</SelectItem>)}
                  </SelectContent>
                </Select>
                <div className="flex items-center gap-2">
                  <Button variant="secondary" onClick={handleAutoPool} disabled={!matchGameId || createMatchPool.isPending}>
                    <Swords className="w-4 h-4 mr-1" />Auto-Pool (Round Robin)
                  </Button>
                  <Button onClick={() => { setMatchFormGameId(matchGameId); setEditingMatchId(''); setMatchDialog(true); }} disabled={!matchGameId}><Plus className="w-4 h-4 mr-1" />Add Match</Button>
                </div>
              </div>
              {matchPoolsForGame.length > 0 ? (
                <div className="bg-card border border-border rounded-xl overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead>Round</TableHead><TableHead>Team A</TableHead><TableHead>Score</TableHead>
                        <TableHead>Team B</TableHead><TableHead>Score</TableHead><TableHead>Winner</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {matchPoolsForGame.map(m => (
                        <TableRow key={m.id}>
                          <TableCell><Badge variant="outline">{m.round_name}</Badge></TableCell>
                          <TableCell className="font-medium">{m.team_a_school?.name || '-'}</TableCell>
                          <TableCell className="font-bold">{m.team_a_score ?? '-'}</TableCell>
                          <TableCell className="font-medium">{m.team_b_school?.name || '-'}</TableCell>
                          <TableCell className="font-bold">{m.team_b_score ?? '-'}</TableCell>
                          <TableCell>{m.winner_school?.name || 'TBD'}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="outline" size="sm" onClick={() => { setEditingMatchId(m.id); setMatchFormGameId(matchGameId); setMatchDialog(true); }}>Update</Button>
                              <Button variant="ghost" size="icon" onClick={() => setDeleteDialog({ type: 'match', id: m.id })}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">{matchGameId ? 'No matches yet' : 'Select a ball game'}</div>
              )}
            </TabsContent>

            {/* ===== CHAMPIONSHIPS TAB ===== */}
            <TabsContent value="championships" className="space-y-4">
              <div className="flex items-center justify-end">
                {(isSuperAdmin || tenant) && (
                  <Button onClick={() => { setEditingChampionship(null); setChampLevel('zone'); setChampSchoolLevel('primary_junior'); setChampionshipDialog(true); }}>
                    <Plus className="w-4 h-4 mr-1" />Create Championship
                  </Button>
                )}
              </div>
              {championships.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No championships created yet</div>
              ) : (
                <div className="space-y-4">
                  {championships.map(c => (
                    <div key={c.id} className="bg-card border border-border rounded-xl p-6 flex items-start justify-between">
                      <div>
                        <h3 className="font-display text-xl text-foreground">{c.name}</h3>
                        <div className="flex gap-2 mt-2">
                          <Badge variant="outline">{SCHOOL_LEVEL_LABELS[c.school_level]}</Badge>
                          <Badge variant="secondary">{LEVEL_LABELS[c.level]}</Badge>
                          {c.location && <Badge variant="outline">{c.location}</Badge>}
                        </div>
                        {c.start_date && <p className="text-sm text-muted-foreground mt-2">{c.start_date}{c.end_date ? ` — ${c.end_date}` : ''}</p>}
                        {c.description && <p className="text-sm mt-2">{c.description}</p>}
                      </div>
                      {(isSuperAdmin || (tenant && activeSubscription && c.tenant_id === tenant.id)) && (
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" onClick={() => { setEditingChampionship(c); setChampLevel(c.level); setChampSchoolLevel(c.school_level); setChampionshipDialog(true); }}><Pencil className="w-4 h-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => setDeleteDialog({ type: 'championship', id: c.id })}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* ===== CIRCULARS TAB ===== */}
            <TabsContent value="circulars" className="space-y-4">
              <div className="flex items-center justify-end">
                <Button onClick={() => { setEditingCircular(null); setCircularDialog(true); }}><Plus className="w-4 h-4 mr-1" />Publish Circular</Button>
              </div>
              {circulars.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No circulars published yet</div>
              ) : (
                <div className="space-y-4">
                  {circulars.map(c => (
                    <div key={c.id} className="bg-card border border-border rounded-xl p-6 flex items-start justify-between">
                      <div>
                        <h3 className="font-display text-xl text-foreground">{c.title}</h3>
                        <p className="text-sm text-muted-foreground mt-1">By {c.sender_name} ({c.sender_role}) • {LEVEL_LABELS[c.target_level]}</p>
                        <p className="text-sm mt-2 line-clamp-3">{c.content}</p>
                        {c.document_url && <a href={c.document_url} target="_blank" rel="noopener noreferrer" className="text-sm text-secondary hover:underline mt-1 inline-block">📎 View Document</a>}
                      </div>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" onClick={() => { setEditingCircular(c); setCircularLevel(c.target_level); setCircularDialog(true); }}><Pencil className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => setDeleteDialog({ type: 'circular', id: c.id })}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
          </div>
        )}
        </>
        );
        })()}
      </div>

      {/* ===== DIALOGS ===== */}

      {/* Game Dialog */}
      <Dialog open={gameDialog} onOpenChange={setGameDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" aria-describedby="game-dialog-desc">
          <DialogHeader><DialogTitle>{editingGame ? 'Edit Game' : 'Add New Game'}</DialogTitle></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); handleSaveGame(new FormData(e.currentTarget)); }}>
            <div className="space-y-4 py-4">
              <div className="space-y-2"><Label htmlFor="name">Game Name</Label><Input id="name" name="name" defaultValue={editingGame?.name} required /></div>
              
              {/* Category (school level) first */}
              <div className="space-y-2"><Label>Category</Label>
                <Select value={gameFormSchoolLevel} onValueChange={(v) => { setGameFormSchoolLevel(v as SchoolLevel); setGameFormChampionshipId(''); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="base">Base</SelectItem>
                    <SelectItem value="primary">Primary Only</SelectItem>
                    <SelectItem value="junior_secondary">Junior Secondary Only</SelectItem>
                    <SelectItem value="primary_junior">Primary/Junior School</SelectItem>
                    <SelectItem value="senior_secondary">Senior Secondary</SelectItem>
                    <SelectItem value="tertiary">Tertiary</SelectItem>
                    <SelectItem value="open">Open Tournament</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Championship - filtered by category */}
              {championships.length > 0 && (
                <div className="space-y-2"><Label>Championship</Label>
                  <Select value={gameFormChampionshipId || 'none'} onValueChange={(v) => setGameFormChampionshipId(v === 'none' ? '' : v)}>
                    <SelectTrigger><SelectValue placeholder="Select championship" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Championship</SelectItem>
                      {championshipsForGameCategory.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">Level auto-fills from championship</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Game Category</Label>
                  <Select value={gameFormCategory} onValueChange={(v) => { setGameFormCategory(v as GameCategory); setGameFormRaceType(''); }}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="ball_games">Ball Games</SelectItem><SelectItem value="athletics">Athletics</SelectItem><SelectItem value="music">Music</SelectItem><SelectItem value="other">Other</SelectItem></SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label>Level</Label>
                  <Select value={gameFormLevel} onValueChange={(v) => setGameFormLevel(v as CompetitionLevel)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="base">Base</SelectItem><SelectItem value="ward">Ward</SelectItem><SelectItem value="zone">Zone</SelectItem><SelectItem value="subcounty">Sub-County</SelectItem><SelectItem value="county">County</SelectItem><SelectItem value="region">Region</SelectItem><SelectItem value="national">National</SelectItem></SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2"><Label>Gender</Label>
                <Select value={gameFormGender} onValueChange={(v) => setGameFormGender(v as Gender)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="boys">Boys</SelectItem><SelectItem value="girls">Girls</SelectItem><SelectItem value="mixed">Mixed</SelectItem><SelectItem value="male">Male</SelectItem><SelectItem value="female">Female</SelectItem></SelectContent>
                </Select>
              </div>

              {/* Athletics-specific */}
              {gameFormCategory === 'athletics' && (
                <div className="space-y-2"><Label>Event Type</Label>
                  <Select value={gameFormRaceType || 'track'} onValueChange={(v) => setGameFormRaceType(v === 'track' ? '' : v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="track">Track Event</SelectItem>
                      <SelectItem value="field_event">Field Event</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2"><Label htmlFor="description">Description</Label><Textarea id="description" name="description" defaultValue={editingGame?.description || ''} /></div>
              
              <div className="flex items-center gap-2">
                <Switch id="is_timed" defaultChecked={editingGame?.is_timed} onCheckedChange={(checked) => {
                  const input = document.querySelector('input[name="is_timed"]') as HTMLInputElement;
                  if (input) input.value = checked ? 'true' : 'false';
                }} />
                <input type="hidden" name="is_timed" defaultValue={editingGame?.is_timed ? 'true' : 'false'} />
                <Label htmlFor="is_timed">{gameFormRaceType === 'field_event' ? 'Measurement Taken' : 'Timed Event'}</Label>
              </div>
              <div className="space-y-2">
                <Label htmlFor="max_qualifiers">Max Qualifiers</Label>
                <Input id="max_qualifiers" name="max_qualifiers" type="number" min="1" defaultValue={editingGame?.max_qualifiers || ''} placeholder="e.g. 2" required />
                <p className="text-xs text-muted-foreground">Positions ≤ this number auto-qualify when recording results</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="scheduled_date">Scheduled Date (optional)</Label>
                <Input id="scheduled_date" name="scheduled_date" type="date" defaultValue={editingGame?.scheduled_date || ''} />
                <p className="text-xs text-muted-foreground">For multi-day championships — events will be grouped per day in the Call Room.</p>
              </div>
            </div>
            <DialogFooter><Button type="button" variant="outline" onClick={() => setGameDialog(false)}>Cancel</Button><Button type="submit">Save</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Team Dialog */}
      <Dialog open={schoolDialog} onOpenChange={setSchoolDialog}>
        <DialogContent aria-describedby="school-dialog-desc">
          <DialogHeader><DialogTitle>{editingSchool ? 'Edit Team' : 'Add New Team'}</DialogTitle></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); handleSaveSchool(new FormData(e.currentTarget)); }}>
            <div className="space-y-4 py-4">
              <div className="space-y-2"><Label htmlFor="school_name">Team Name</Label><Input id="school_name" name="name" defaultValue={editingSchool?.name} required /></div>
              <div className="space-y-2">
                <Label>Championship</Label>
                <Select value={schoolFormChampionshipId} onValueChange={setSchoolFormChampionshipId}>
                  <SelectTrigger><SelectValue placeholder="Select championship" /></SelectTrigger>
                  <SelectContent>
                    {championships.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <input type="hidden" name="championship_id" value={schoolFormChampionshipId} />
              </div>
              <div className="space-y-2">
                <Label>Competition Level</Label>
                <Select value={schoolFormLevel} onValueChange={(v) => setSchoolFormLevel(v as CompetitionLevel)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="base">Base</SelectItem>
                    <SelectItem value="zone">Zone</SelectItem>
                    <SelectItem value="subcounty">Sub-County</SelectItem>
                    <SelectItem value="county">County</SelectItem>
                    <SelectItem value="region">Region</SelectItem>
                    <SelectItem value="national">National</SelectItem>
                  </SelectContent>
                </Select>
                <input type="hidden" name="competition_level" value={schoolFormLevel} />
              </div>
            </div>
            <DialogFooter><Button type="button" variant="outline" onClick={() => setSchoolDialog(false)}>Cancel</Button><Button type="submit">Save</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Participant / Record Results Dialog */}
      <Dialog open={participantDialog} onOpenChange={setParticipantDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" aria-describedby="participant-dialog-desc">
          <DialogHeader><DialogTitle>{editingParticipant ? 'Edit Result' : 'RECORD RESULT'}</DialogTitle></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); handleSaveParticipant(new FormData(e.currentTarget)); }}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="full_name">Name</Label>
                <Input id="full_name" name="full_name" placeholder="Full name" defaultValue={editingParticipant ? `${editingParticipant.first_name} ${editingParticipant.last_name}` : ''} required />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Gender</Label>
                  <Select value={participantFormGender} onValueChange={(v) => setParticipantFormGender(v as Gender)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="boys">Boy</SelectItem><SelectItem value="girls">Girl</SelectItem><SelectItem value="mixed">Mixed</SelectItem><SelectItem value="male">Male</SelectItem><SelectItem value="female">Female</SelectItem></SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select value={participantFormSchoolLevel} onValueChange={(v) => { setParticipantFormSchoolLevel(v as SchoolLevel); setParticipantFormChampionshipId(''); setParticipantFormGameId(''); setSelectedSchoolId(''); }}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="base">Base</SelectItem>
                      <SelectItem value="primary">Primary Only</SelectItem>
                      <SelectItem value="junior_secondary">Junior Secondary Only</SelectItem>
                        <SelectItem value="primary_junior">Primary/Junior School</SelectItem>
                        <SelectItem value="senior_secondary">Senior Secondary</SelectItem>
                        <SelectItem value="tertiary">Tertiary</SelectItem>
                      <SelectItem value="open">Open Tournament</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Team Dropdown - Custom Implementation */}
              <div className="space-y-2">
                <Label>Team</Label>
                <div className="relative">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Search team..."
                      value={selectedTeamId && !teamSearchInput ? (schools.find(s => s.id === selectedTeamId)?.name || '') : teamSearchInput}
                      onChange={(e) => {
                        const value = e.target.value;
                        setTeamSearchInput(value);
                        debouncedSetTeamSearch(value);
                        if (selectedTeamId) setSelectedTeamId('');
                      }}
                      className="flex-1"
                    />
                    {selectedTeamId && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedTeamId('');
                          setTeamSearchInput('');
                          setTeamSearch('');
                        }}
                      >
                        Clear
                      </Button>
                    )}
                  </div>
                  {teamSearchInput && !selectedTeamId && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                      {allTeamsFiltered.length === 0 ? (
                        <div className="p-3 text-sm text-gray-500">
                          No teams found
                        </div>
                      ) : (
                        allTeamsFiltered.map(team => (
                          <div
                            key={team.id}
                            className="px-3 py-2 hover:bg-orange-50 cursor-pointer text-sm"
                            onClick={() => {
                              setSelectedTeamId(team.id);
                              setTeamSearchInput('');
                              setTeamSearch('');
                            }}
                          >
                            {team.name}
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="school_name_field">School</Label>
                <Input id="school_name_field" name="school_name" placeholder="Enter school name" value={participantSchoolInput} onChange={(e) => setParticipantSchoolInput(e.target.value)} />
              </div>

              <div className="space-y-2">
                <Label>Championship</Label>
                <Select value={participantFormChampionshipId} onValueChange={(v) => { setParticipantFormChampionshipId(v); setParticipantFormGameId(''); }}>
                  <SelectTrigger disabled={!participantFormSchoolLevel}><SelectValue placeholder={participantFormSchoolLevel ? 'Select championship' : 'Select category first'} /></SelectTrigger>
                  <SelectContent>
                    {championshipsForParticipantCategory.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {/* Searchable Game Select */}
              <div className="space-y-2">
                <Label>Game</Label>
                <div className="flex gap-2 mb-2">
                  <Select value={participantGameCatFilter} onValueChange={(v) => setParticipantGameCatFilter(v as GameCategory | 'all')}>
                    <SelectTrigger className="w-32 h-8 text-xs"><SelectValue placeholder="Category" /></SelectTrigger>
                    <SelectContent><SelectItem value="all">All</SelectItem><SelectItem value="ball_games">Ball Games</SelectItem><SelectItem value="athletics">Athletics</SelectItem><SelectItem value="music">Music</SelectItem><SelectItem value="other">Other</SelectItem></SelectContent>
                  </Select>
                  <Select value={participantGameGenderFilter} onValueChange={(v) => setParticipantGameGenderFilter(v as Gender | 'all')}>
                    <SelectTrigger className="w-28 h-8 text-xs"><SelectValue placeholder="Gender" /></SelectTrigger>
                    <SelectContent><SelectItem value="all">All</SelectItem><SelectItem value="boys">Boys</SelectItem><SelectItem value="girls">Girls</SelectItem><SelectItem value="mixed">Mixed</SelectItem><SelectItem value="male">Male</SelectItem><SelectItem value="female">Female</SelectItem></SelectContent>
                  </Select>
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                  <Input
                    placeholder="Search games..."
                    value={participantGameSearchInput}
                    onChange={(e) => {
                      const value = e.target.value;
                      setParticipantGameSearchInput(value);
                      debouncedSetParticipantGameSearch(value);
                    }}
                    className="pl-8 h-8 text-sm"
                  />
                </div>
                <Select value={participantFormGameId} onValueChange={setParticipantFormGameId} disabled={!participantFormChampionshipId}>
                  <SelectTrigger><SelectValue placeholder={participantFormChampionshipId ? 'Select game' : 'Select championship first'} /></SelectTrigger>
                  <SelectContent>
                    {filteredGamesForParticipant.map(g => <SelectItem key={g.id} value={g.id}>{g.name} ({GENDER_LABELS[g.gender]})</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="bib_number">Bib Number</Label>
                  <Input
                    key={`bib-${selectedTeamId}-${participantFormChampionshipId}-${editingParticipant?.id || 'new'}`}
                    id="bib_number"
                    name="bib_number"
                    placeholder={suggestedBib || 'e.g. 101'}
                    defaultValue={editingParticipant?.bib_number || suggestedBib || ''}
                  />
                  {suggestedBib && !editingParticipant && <p className="text-xs text-muted-foreground">Auto-suggested from school's bib range</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="date_of_birth">Date of Birth</Label>
                  <Input id="date_of_birth" name="date_of_birth" type="date" defaultValue={editingParticipant?.date_of_birth || ''} />
                  <p className="text-xs text-muted-foreground">Hidden from public view</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label htmlFor="position">Position</Label><Input id="position" name="position" type="number" min="1" defaultValue={editingParticipant?.position || ''} /></div>
                <div className="space-y-2"><Label htmlFor="time_taken">Time (e.g. 0.12.06)</Label><Input id="time_taken" name="time_taken" placeholder="0.12.06" defaultValue={editingParticipant?.time_taken ? formatTimeDisplay(editingParticipant.time_taken) : ''} /></div>
              </div>
              <p className="text-xs text-muted-foreground">Points: 1st=7, 2nd=5, 3rd=4, 4th=3, 5th=2, 6th=1. Auto-qualifies if position ≤ max qualifiers.</p>
              
              <div className="flex items-center gap-2">
                <Switch id="is_qualified" defaultChecked={editingParticipant?.is_qualified} onCheckedChange={(checked) => {
                  const input = document.querySelector('input[name="is_qualified"]') as HTMLInputElement;
                  if (input) input.value = checked ? 'true' : 'false';
                }} />
                <input type="hidden" name="is_qualified" defaultValue={editingParticipant?.is_qualified ? 'true' : 'false'} />
                <Label htmlFor="is_qualified">Qualified for next level</Label>
              </div>
            </div>
            <DialogFooter><Button type="button" variant="outline" onClick={() => setParticipantDialog(false)}>Cancel</Button><Button type="submit">Save</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Championship Dialog */}
      <Dialog open={championshipDialog} onOpenChange={setChampionshipDialog}>
        <DialogContent aria-describedby="championship-dialog-desc">
          <DialogHeader><DialogTitle>{editingChampionship ? 'Edit Championship' : 'Create Championship'}</DialogTitle></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); handleSaveChampionship(new FormData(e.currentTarget)); }}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="champ_name">Championship Name</Label>
                <Input
                  id="champ_name"
                  name="name"
                  value={championshipNameInput}
                  onChange={(e) => setChampionshipNameInput(e.target.value)}
                  placeholder="e.g. Meru County 2026 Athletics"
                  required
                />
                <p className="text-xs text-muted-foreground">Final name: {formatChampionshipName(championshipNameInput, champLevel)}</p>
              </div>
              <div className="space-y-2"><Label>Category</Label>
                <Select value={champSchoolLevel} onValueChange={(v) => setChampSchoolLevel(v as SchoolLevel)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="base">Base</SelectItem>
                    <SelectItem value="primary">Primary</SelectItem>
                    <SelectItem value="junior_secondary">Junior Secondary</SelectItem>
                    <SelectItem value="primary_junior">Primary/Junior School</SelectItem>
                    <SelectItem value="senior_secondary">Senior Secondary</SelectItem>
                    <SelectItem value="tertiary">Tertiary</SelectItem>
                    <SelectItem value="open">Open Tournament</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Level</Label>
                <Select value={champLevel} onValueChange={(v) => setChampLevel(v as CompetitionLevel)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="base">Base</SelectItem><SelectItem value="ward">Ward</SelectItem><SelectItem value="zone">Zone</SelectItem><SelectItem value="subcounty">Sub-County</SelectItem><SelectItem value="county">County</SelectItem><SelectItem value="region">Region</SelectItem><SelectItem value="national">National</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label htmlFor="location">Location/Venue</Label><Input id="location" name="location" defaultValue={editingChampionship?.location || ''} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label htmlFor="start_date">Start Date</Label><Input id="start_date" name="start_date" type="date" defaultValue={editingChampionship?.start_date || ''} /></div>
                <div className="space-y-2"><Label htmlFor="end_date">End Date</Label><Input id="end_date" name="end_date" type="date" defaultValue={editingChampionship?.end_date || ''} /></div>
              </div>
              <div className="space-y-2"><Label htmlFor="champ_desc">Description</Label><Textarea id="champ_desc" name="description" defaultValue={editingChampionship?.description || ''} /></div>
            </div>
            <DialogFooter><Button type="button" variant="outline" onClick={() => { setChampionshipDialog(false); setEditingChampionship(null); }}>Cancel</Button><Button type="submit">{editingChampionship ? 'Update' : 'Create'}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Circular Dialog */}
      <Dialog open={circularDialog} onOpenChange={(open) => { setCircularDialog(open); if (!open) setEditingCircular(null); }}>
        <DialogContent aria-describedby="circular-dialog-desc">
          <DialogHeader><DialogTitle>{editingCircular ? 'Edit Circular' : 'Publish Circular'}</DialogTitle></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); handleSaveCircular(new FormData(e.currentTarget)); }}>
            <div className="space-y-4 py-4">
              <div className="space-y-2"><Label htmlFor="circ_title">Title</Label><Input id="circ_title" name="title" defaultValue={editingCircular?.title || ''} required /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label htmlFor="sender_name">Sender Name</Label><Input id="sender_name" name="sender_name" defaultValue={editingCircular?.sender_name || ''} required /></div>
                <div className="space-y-2"><Label htmlFor="sender_role">Sender Role</Label><Input id="sender_role" name="sender_role" defaultValue={editingCircular?.sender_role || 'National Admin'} /></div>
              </div>
              <div className="space-y-2"><Label>Target Level</Label>
                <Select value={circularLevel} onValueChange={(v) => setCircularLevel(v as CompetitionLevel)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="base">Base</SelectItem><SelectItem value="ward">Ward</SelectItem><SelectItem value="zone">Zone</SelectItem><SelectItem value="subcounty">Sub-County</SelectItem><SelectItem value="county">County</SelectItem><SelectItem value="region">Region</SelectItem><SelectItem value="national">National</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label htmlFor="circ_content">Content</Label><Textarea id="circ_content" name="content" defaultValue={editingCircular?.content || ''} rows={6} required /></div>
              <div className="space-y-2">
                <Label htmlFor="circ_document">Attach Document/Image (Optional)</Label>
                <Input id="circ_document" type="file" onChange={(e) => setCircularDocument(e.target.files?.[0] || null)} className="cursor-pointer" accept="*/*" />
                {circularDocument && <p className="text-sm text-success">✓ File selected: {circularDocument.name}</p>}
                {editingCircular?.document_url && !circularDocument && <p className="text-sm text-muted-foreground">Existing document attached</p>}
              </div>
            </div>
            <DialogFooter><Button type="button" variant="outline" onClick={() => { setCircularDialog(false); setCircularDocument(null); setEditingCircular(null); }}>Cancel</Button><Button type="submit">{editingCircular ? 'Update' : 'Publish'}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Heat Participant Dialog */}
      <Dialog open={editHpDialog} onOpenChange={(open) => { setEditHpDialog(open); if (!open) setEditingHeatParticipant(null); }}>
        <DialogContent aria-describedby="edit-hp-dialog-desc">
          <DialogHeader><DialogTitle>Edit Heat Result</DialogTitle></DialogHeader>
          <form onSubmit={async (e) => {
            e.preventDefault();
            if (!editingHeatParticipant) return;
            const isFinalHeat = editingHeatParticipant.heat?.heat_type === 'final';
            const fd = new FormData(e.currentTarget);
            const timeInput = fd.get('time_taken') as string;
            const timeTaken = timeInput ? parseTimeInput(timeInput) : undefined;
            const position = editHpPositionInput ? parseInt(editHpPositionInput) : undefined;
            const pointsToAward = isFinalHeat ? (getPointsForPosition(position) ?? 0) : 0;
            const isQualifiedByPosition = position !== undefined && position <= 3;
            const finalQualification = hpQualifiedForFinal || isQualifiedByPosition;
            try {
              await updateHeatParticipant.mutateAsync({
                id: editingHeatParticipant.id,
                time_taken: timeTaken ?? undefined,
                position,
                is_qualified_for_final: finalQualification,
              });
              toast.success('Heat result updated');
              setEditHpDialog(false);
              setEditingHeatParticipant(null);
            } catch { toast.error('Failed to update'); }
          }}>
            <div className="space-y-4 py-4">
              <p className="text-sm text-muted-foreground">
                {editingHeatParticipant?.participant?.first_name} {editingHeatParticipant?.participant?.last_name} — {editingHeatParticipant?.participant?.school?.name}
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label htmlFor="edit_hp_pos">Position</Label><Input id="edit_hp_pos" name="position" type="number" min="1" value={editHpPositionInput} onChange={(e) => {
                  const value = e.target.value;
                  setEditHpPositionInput(value);
                  const parsed = value ? parseInt(value) : undefined;
                  if (parsed && parsed <= 3) {
                    setHpQualifiedForFinal(true);
                  }
                }} /></div>
                <div className="space-y-2"><Label htmlFor="edit_hp_time">Time (e.g. 0.12.06)</Label><Input id="edit_hp_time" name="time_taken" placeholder="0.12.06" defaultValue={editingHeatParticipant?.time_taken ? formatTimeDisplay(editingHeatParticipant.time_taken) : ''} /></div>
              </div>
              <div className="flex items-center gap-2 mt-3">
                <Switch
                  checked={hpQualifiedForFinal}
                  onCheckedChange={setHpQualifiedForFinal}
                />
                <Label>{editingHeatParticipant?.heat?.heat_type === 'final' ? 'Qualify for Next Level' : 'Qualify for Finals'}</Label>
              </div>
              <p className="text-xs text-muted-foreground">
                {editingHeatParticipant?.heat?.heat_type === 'final'
                  ? 'Points: 1st=7, 2nd=5, 3rd=4, 4th=3, 5th=2, 6th=1.'
                  : 'Position determines who goes to finals. Points awarded in Final only.'}
              </p>
            </div>
            <DialogFooter><Button type="button" variant="outline" onClick={() => { setEditHpDialog(false); setEditingHeatParticipant(null); }}>Cancel</Button><Button type="submit">Update</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Heat Dialog */}
      <Dialog open={heatDialog} onOpenChange={(open) => {
        setHeatDialog(open);
        if (open) {
          setHeatFormGameId(heatGameId);
          setHeatFormType('heat');
        }
      }}>
        <DialogContent aria-describedby="heat-dialog-desc">
          <DialogHeader><DialogTitle>Create Heat</DialogTitle></DialogHeader>
          {selectedHeatGame && (
            <div className="flex flex-wrap gap-2 mb-2">
              <Badge variant="outline">{CATEGORY_LABELS[selectedHeatGame.category]}</Badge>
              <Badge variant="outline" className={selectedHeatGame.gender === 'boys' ? 'border-blue-400 text-blue-600' : 'border-pink-400 text-pink-600'}>{GENDER_LABELS[selectedHeatGame.gender]}</Badge>
              <Badge variant="outline">{SCHOOL_LEVEL_LABELS[selectedHeatGame.school_level]}</Badge>
              <Badge variant="outline">{selectedHeatGame.name}</Badge>
            </div>
          )}
          <form onSubmit={(e) => { e.preventDefault(); handleCreateHeat(new FormData(e.currentTarget)); }}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Game</Label>
                <Input value={selectedHeatGame?.name || 'No game selected'} readOnly />
              </div>
              <div className="space-y-2"><Label>Type</Label>
                <Select value={heatFormType} onValueChange={setHeatFormType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="heat">Heat</SelectItem><SelectItem value="final">Final</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label htmlFor="heat_number">Heat Number</Label><Input id="heat_number" name="heat_number" type="number" min="1" defaultValue="1" /></div>
            </div>
            <DialogFooter><Button type="button" variant="outline" onClick={() => setHeatDialog(false)}>Cancel</Button><Button type="submit">Create</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Heat Participant Dialog */}
      <Dialog open={heatParticipantDialog} onOpenChange={setHeatParticipantDialog}>
        <DialogContent className="max-w-lg" aria-describedby="heat-participant-dialog-desc">
          <DialogHeader><DialogTitle>Add Participant to Heat</DialogTitle></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); handleAddHeatParticipant(new FormData(e.currentTarget)); }}>
            <div className="space-y-4 py-4">
              <div className="space-y-2"><Label>Heat</Label>
                <Select value={hpHeatId} onValueChange={setHpHeatId}>
                  <SelectTrigger><SelectValue placeholder="Select heat" /></SelectTrigger>
                  <SelectContent>{heatsForGame.map(h => <SelectItem key={h.id} value={h.id}>{h.heat_type === 'final' ? 'Final' : `Heat ${h.heat_number}`}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="hp_name">Participant Name</Label>
                <Input id="hp_name" placeholder="Enter full name" value={hpParticipantName} onChange={(e) => setHpParticipantName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Team</Label>
                <div className="relative">
                  <Input
                    placeholder="Search team..."
                    value={heatTeamSearch}
                    onChange={e => {
                      setHeatTeamSearch(e.target.value);
                      setHeatSelectedTeamId('');
                    }}
                  />
                  {heatTeamSearch.trim() !== '' && !heatSelectedTeamId && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                      {filteredHeatTeams.length === 0 ? (
                        <div className="p-3 text-sm text-gray-500">
                          No teams found
                        </div>
                      ) : filteredHeatTeams.map(team => (
                        <div
                          key={team.id}
                          className="px-3 py-2 hover:bg-orange-50 cursor-pointer text-sm border-b"
                          onClick={() => {
                            setHeatSelectedTeamId(team.id);
                            setHeatTeamSearch(team.name);
                          }}
                        >
                          {team.name}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label>School (optional)</Label>
                <Input
                  placeholder="Enter school name..."
                  value={heatSchoolSearch}
                  onChange={e => setHeatSchoolSearch(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label htmlFor="hp_time">Time (e.g. 0.12.06)</Label><Input id="hp_time" name="time_taken" placeholder="0.12.06" /></div>
                <div className="space-y-2"><Label htmlFor="hp_pos">Position</Label><Input id="hp_pos" name="position" type="number" min="1" /></div>
              </div>
              <p className="text-xs text-muted-foreground">
                {(() => {
                  const selectedHeat = heatsForGame.find((h) => h.id === hpHeatId);
                  if (selectedHeat?.heat_type === 'final') {
                    return 'Points: 1st=7, 2nd=5, 3rd=4, 4th=3, 5th=2, 6th=1';
                  }
                  return 'Positions 1, 2 & 3 qualify for Final. No points in heats.';
                })()}
              </p>
            </div>
            <DialogFooter><Button type="button" variant="outline" onClick={() => setHeatParticipantDialog(false)}>Cancel</Button><Button type="submit">Add</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Match Dialog */}
      <Dialog open={matchDialog} onOpenChange={setMatchDialog}>
        <DialogContent aria-describedby="match-dialog-desc">
          <DialogHeader><DialogTitle>{editingMatchId ? 'Update Match Scores' : 'Create Match'}</DialogTitle></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); handleCreateMatch(new FormData(e.currentTarget)); }}>
            <div className="space-y-4 py-4">
              {!editingMatchId && (
                <>
                  <div className="space-y-2"><Label htmlFor="round_name">Round Name</Label><Input id="round_name" name="round_name" defaultValue="Round 1" /></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>Team A</Label>
                      <Select value={matchTeamA} onValueChange={setMatchTeamA}>
                        <SelectTrigger><SelectValue placeholder="Select team" /></SelectTrigger>
                        <SelectContent>{schools.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2"><Label>Team B</Label>
                      <Select value={matchTeamB} onValueChange={setMatchTeamB}>
                        <SelectTrigger><SelectValue placeholder="Select team" /></SelectTrigger>
                        <SelectContent>{schools.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                </>
              )}
              {editingMatchId && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><Label htmlFor="team_a_score">Team A Score</Label><Input id="team_a_score" name="team_a_score" type="number" /></div>
                    <div className="space-y-2"><Label htmlFor="team_b_score">Team B Score</Label><Input id="team_b_score" name="team_b_score" type="number" /></div>
                  </div>
                  <div className="space-y-2"><Label>Winner</Label>
                    <Select name="winner" defaultValue="">
                      <SelectTrigger><SelectValue placeholder="Select winner" /></SelectTrigger>
                      <SelectContent>
                        {(() => {
                          const match = matchPoolsForGame.find(m => m.id === editingMatchId);
                          return [
                            match?.team_a_school_id && <SelectItem key="a" value={match.team_a_school_id}>{match.team_a_school?.name}</SelectItem>,
                            match?.team_b_school_id && <SelectItem key="b" value={match.team_b_school_id}>{match.team_b_school?.name}</SelectItem>,
                          ];
                        })()}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2"><Label htmlFor="match_notes">Notes</Label><Textarea id="match_notes" name="notes" /></div>
                </>
              )}
            </div>
            <DialogFooter><Button type="button" variant="outline" onClick={() => { setMatchDialog(false); setEditingMatchId(''); }}>Cancel</Button><Button type="submit">{editingMatchId ? 'Update' : 'Create'}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Qualify Dialog */}
      <Dialog open={qualifyDialog} onOpenChange={setQualifyDialog}>
        <DialogContent className="max-w-2xl" aria-describedby="qualify-dialog-desc">
          <DialogHeader><DialogTitle>Select Qualifiers - {selectedGameForQualify?.name}</DialogTitle></DialogHeader>
          <div className="py-4">
            <p className="text-muted-foreground mb-4">Select up to {selectedGameForQualify?.max_qualifiers} participants. Selected: {selectedQualifiers.length}/{selectedGameForQualify?.max_qualifiers}</p>
            <div className="max-h-96 overflow-y-auto space-y-2">
              {participants.filter(p => p.game_id === selectedGameForQualify?.id).sort((a, b) => (a.position || 999) - (b.position || 999)).map(p => (
                <div key={p.id}
                  className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${selectedQualifiers.includes(p.id) ? 'bg-success/10 border-success' : 'bg-card border-border hover:border-secondary'}`}
                  onClick={() => {
                    if (selectedQualifiers.includes(p.id)) setSelectedQualifiers(prev => prev.filter(id => id !== p.id));
                    else if (selectedQualifiers.length < (selectedGameForQualify?.max_qualifiers || 5)) setSelectedQualifiers(prev => [...prev, p.id]);
                  }}>
                  <div className="flex items-center gap-3">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center ${selectedQualifiers.includes(p.id) ? 'bg-success text-success-foreground' : 'bg-muted'}`}>
                      {selectedQualifiers.includes(p.id) ? <CheckCircle2 className="w-4 h-4" /> : <span className="text-xs">{p.position || '-'}</span>}
                    </div>
                    <div>
                      <p className="font-medium">{p.first_name} {p.last_name}</p>
                      <p className="text-sm text-muted-foreground">{p.school?.name} • {GENDER_LABELS[p.gender]}</p>
                    </div>
                  </div>
                  <div className="text-right text-sm text-muted-foreground">
                    {p.time_taken && <span>{formatTimeDisplay(p.time_taken)}</span>}
                    {p.score != null && <span> Score: {p.score}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setQualifyDialog(false)}>Cancel</Button><Button onClick={handleSaveQualifiers}>Save Qualifiers</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteDialog} onOpenChange={() => setDeleteDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminDashboard;

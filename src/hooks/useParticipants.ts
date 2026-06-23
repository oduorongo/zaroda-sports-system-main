import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { devLog, devError, devDebug } from '@/lib/dev';
import { adminWrite } from '@/integrations/admin/adminWrite';
import { Participant } from '@/types/database';

export const useParticipants = (
  gameId?: string,
  enabled: boolean = true,
  championshipId?: string,
) => {
  return useQuery({
    queryKey: ['participants', gameId ?? 'all-games', championshipId ?? 'all-championships'],
    queryFn: async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const isAuthenticated = Boolean(sessionData.session?.user);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let query: any = isAuthenticated
        ? supabase
            .from('participants')
            .select(`
              id,
              first_name,
              last_name,
              gender,
              position,
              score,
              time_taken,
              is_qualified,
              school_id,
              game_id,
              notes,
              school_name,
              created_at,
              updated_at,
              school:schools(id, name),
              game:games(id, name, championship_id, school_level, gender, category, level)
            `, { count: 'exact' })
        : supabase
            .from('public_participants')
            .select('*', { count: 'exact' });

      query = query.order('created_at', { ascending: false }).range(0, 4999);

      if (championshipId) {
        query = query.eq('championship_id', championshipId);
      }

      const { data, error, count } = await query;

      devLog('[Participants Query Debug]', {
        rawDataLength: data?.length ?? 0,
        error,
        championshipIdQueried: championshipId ?? 'all',
      });

      if (error) {
        devError('Error fetching participants:', error);
        throw error;
      }

      const allParticipants = (data || []) as Participant[];

      // Use JavaScript dedup as a compatibility-safe replacement for .distinct('id').
      const uniqueParticipants = allParticipants.filter((participant, index, self) =>
        index === self.findIndex((x) => x.id === participant.id),
      );

      const filteredByGame = gameId
        ? uniqueParticipants.filter((participant) => participant.game_id === gameId)
        : uniqueParticipants;

      const filteredParticipants = championshipId
        ? filteredByGame.filter((participant) => participant.game?.championship_id === championshipId)
        : filteredByGame;

      devDebug(
        `[Participants Hook] Raw=${allParticipants.length}, Unique=${uniqueParticipants.length}, Returned=${filteredParticipants.length}, Total DB count=${count ?? 0}`,
      );

      return filteredParticipants;
    },
    enabled,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchInterval: false,
    retry: 1,
  });
};

export const useCreateParticipant = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (participant: Omit<Participant, 'id' | 'created_at' | 'updated_at' | 'school' | 'game'>) => {
      const data = await adminWrite<Participant[]>('participants', 'insert', { values: participant });
      return data?.[0];
    },
    retry: 1,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['participants'] });
    },
    onError: (error) => {
      devError('Create participant error:', error);
    },
  });
};

export const useUpdateParticipant = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...participant }: Partial<Participant> & { id: string }) => {
      const { school, game, ...updateData } = participant as any;
      const data = await adminWrite<Participant[]>('participants', 'update', {
        values: updateData,
        match: { id },
      });
      return data?.[0];
    },
    retry: 1,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['participants'] });
    },
  });
};

export const useDeleteParticipant = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await adminWrite('participants', 'delete', { match: { id } });
    },
    retry: 1,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['participants'] });
    },
  });
};

export const useBulkUpdateQualified = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ gameId, qualifiedIds }: { gameId: string; qualifiedIds: string[] }) => {
      // First, set all participants in this game to not qualified
      await adminWrite('participants', 'update', {
        values: { is_qualified: false },
        match: { game_id: gameId },
      });

      // Then set the selected ones as qualified
      if (qualifiedIds.length > 0) {
        await adminWrite('participants', 'update', {
          values: { is_qualified: true },
          in: { id: qualifiedIds },
        });
      }
    },
    retry: 1,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['participants'] });
    },
  });
};

export const useRankByTime = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (gameId: string) => {
      // Get all participants for this game with time
      const { data: participants, error } = await supabase
        .from('participants')
        .select('id, time_taken, position')
        .eq('game_id', gameId)
        .not('time_taken', 'is', null)
        .order('time_taken', { ascending: true });

      if (error) throw error;

      // Update positions based on time ranking
      await Promise.all(
        (participants || []).map((participant, index) =>
          adminWrite('participants', 'update', {
            values: { position: index + 1 },
            match: { id: participant.id },
          }),
        ),
      );
    },
    retry: 1,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['participants'] });
    },
  });
};

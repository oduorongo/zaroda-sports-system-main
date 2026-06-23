import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { adminWrite } from '@/integrations/admin/adminWrite';
import { MatchPool } from '@/types/database';

export const useMatchPools = (gameId?: string, enabled: boolean = true) => {
  return useQuery({
    queryKey: ['match_pools', gameId ?? 'all'],
    queryFn: async () => {
      let query = supabase
        .from('match_pools')
        .select(`
          *,
          team_a_school:schools!match_pools_team_a_school_id_fkey(*),
          team_b_school:schools!match_pools_team_b_school_id_fkey(*),
          winner_school:schools!match_pools_winner_school_id_fkey(*),
          game:games(id, championship_id, school_level, category, gender, level)
        `)
        .order('round_name', { ascending: true })
        .range(0, 9999);
      if (gameId) query = query.eq('game_id', gameId);
      const { data, error } = await query;
      if (error) throw error;
      return data as MatchPool[];
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

export const useCreateMatchPool = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (match: Omit<MatchPool, 'id' | 'created_at' | 'updated_at' | 'team_a_school' | 'team_b_school' | 'winner_school'>) => {
      const data = await adminWrite<MatchPool[]>('match_pools', 'insert', { values: match });
      return data?.[0];
    },
    retry: 1,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['match_pools'] });
    },
  });
};

export const useUpdateMatchPool = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<MatchPool> & { id: string }) => {
      const { team_a_school, team_b_school, winner_school, ...updateData } = data as any;
      const result = await adminWrite<MatchPool[]>('match_pools', 'update', {
        values: updateData,
        match: { id },
      });
      return result?.[0];
    },
    retry: 1,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['match_pools'] });
    },
  });
};

export const useDeleteMatchPool = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await adminWrite('match_pools', 'delete', { match: { id } });
    },
    retry: 1,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['match_pools'] });
    },
  });
};

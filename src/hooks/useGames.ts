import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { adminWrite } from '@/integrations/admin/adminWrite';
import { Game, GameCategory } from '@/types/database';

export const useGames = (category?: GameCategory, enabled: boolean = true, championshipId?: string) => {
  return useQuery({
    queryKey: ['games', category ?? 'all', championshipId ?? 'all-championships'],
    queryFn: async () => {
      let query = supabase.from('games').select('*').order('name');
      if (category) {
        query = query.eq('category', category);
      }
      if (championshipId) {
        query = query.eq('championship_id', championshipId);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data as Game[];
    },
    enabled,
    staleTime: 1000 * 60 * 10,
    gcTime: 1000 * 60 * 10,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchInterval: false,
    retry: 1,
  });
};

export const useGame = (id: string, enabled: boolean = true) => {
  return useQuery({
    queryKey: ['game', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('games')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data as Game;
    },
    enabled: enabled && !!id,
    staleTime: 1000 * 60 * 10,
    gcTime: 1000 * 60 * 10,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchInterval: false,
    retry: 1,
  });
};

export const useCreateGame = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (game: Omit<Game, 'id' | 'created_at' | 'updated_at'> & { race_type?: string | null }) => {
      const data = await adminWrite<Game[]>('games', 'insert', { values: game });
      return data?.[0];
    },
    retry: 1,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['games'] });
    },
  });
};

export const useUpdateGame = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...game }: Partial<Game> & { id: string }) => {
      const data = await adminWrite<Game[]>('games', 'update', { values: game, match: { id } });
      return data?.[0];
    },
    retry: 1,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['games'] });
      queryClient.invalidateQueries({ queryKey: ['game', variables.id] });
    },
  });
};

export const useDeleteGame = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await adminWrite('games', 'delete', { match: { id } });
    },
    retry: 1,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['games'] });
    },
  });
};

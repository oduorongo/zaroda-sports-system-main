import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { adminWrite } from '@/integrations/admin/adminWrite';
import { Heat, HeatParticipant } from '@/types/database';

export const useHeats = (gameId?: string, enabled: boolean = true) => {
  return useQuery({
    queryKey: ['heats', gameId],
    queryFn: async () => {
      let query = supabase
        .from('heats')
        .select('*')
        .eq('game_id', gameId!)
        .order('heat_type', { ascending: true })
        .order('heat_number', { ascending: true });

      const { data, error } = await query;

      if (error) throw error;
      return data as Heat[];
    },
    enabled: enabled && !!gameId,
    staleTime: 1000 * 30,
    gcTime: 1000 * 60 * 10,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchInterval: false,
    retry: 1,
  });
};

export const useHeatParticipants = (heatId?: string, enabled: boolean = true) => {
  return useQuery({
    queryKey: ['heat_participants', heatId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('heat_participants')
        .select(`
          *,
          participant:participants(
            id,
            first_name,
            last_name,
            school:schools(id, name)
          )
        `)
        .eq('heat_id', heatId!)
        .order('position', { ascending: true, nullsFirst: false });
      if (error) throw error;
      return (data ?? []) as unknown as HeatParticipant[];
    },
    enabled: enabled && !!heatId,
    staleTime: 1000 * 30,
    gcTime: 1000 * 60 * 10,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchInterval: false,
    retry: 1,
  });
};

export const useAllHeatParticipants = (gameId?: string, enabled: boolean = true) => {
  return useQuery({
    queryKey: ['all_heat_participants', gameId],
    queryFn: async () => {
      const { data: heats, error: heatsError } = await supabase
        .from('heats')
        .select('id')
        .eq('game_id', gameId!);
      if (heatsError) throw heatsError;

      const heatIds = (heats || []).map(h => h.id);
      if (heatIds.length === 0) return [];

      const { data, error } = await supabase
        .from('heat_participants')
        .select(`
          *,
          participant:participants(id, first_name, last_name, school:schools(id, name)),
          heat:heats(*)
        `)
        .in('heat_id', heatIds)
        .order('position', { ascending: true, nullsFirst: false });
      if (error) throw error;
      return (data ?? []) as unknown as HeatParticipant[];
    },
    enabled: enabled && !!gameId,
    staleTime: 1000 * 30,
    gcTime: 1000 * 60 * 10,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchInterval: false,
    retry: 1,
  });
};

export const useCreateHeat = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (heat: Omit<Heat, 'id' | 'created_at'>) => {
      const data = await adminWrite<Heat[]>('heats', 'insert', { values: heat });
      return data?.[0];
    },
    retry: 1,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['heats'] });
    },
  });
};

export const useDeleteHeat = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await adminWrite('heats', 'delete', { match: { id } });
    },
    retry: 1,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['heats'] });
      queryClient.invalidateQueries({ queryKey: ['heat_participants'] });
      queryClient.invalidateQueries({ queryKey: ['all_heat_participants'] });
    },
  });
};

export const useAddHeatParticipant = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (hp: Omit<HeatParticipant, 'id' | 'created_at' | 'participant' | 'heat'>) => {
      const data = await adminWrite<HeatParticipant[]>('heat_participants', 'insert', { values: hp });
      return data?.[0];
    },
    retry: 1,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['heat_participants'] });
      queryClient.invalidateQueries({ queryKey: ['all_heat_participants'] });
    },
  });
};

export const useUpdateHeatParticipant = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<HeatParticipant> & { id: string }) => {
      const { participant, heat, ...updateData } = data as any;

      // If score is provided, only allow it for final heat results.
      if (Object.prototype.hasOwnProperty.call(updateData, 'score')) {
        const { data: existingHp, error: existingError } = await supabase
          .from('heat_participants')
          .select('heat_id')
          .eq('id', id)
          .single();
        if (existingError) throw existingError;

        const { data: heatData, error: heatError } = await supabase
          .from('heats')
          .select('heat_type')
          .eq('id', existingHp.heat_id)
          .single();
        if (heatError) throw heatError;

        if (heatData?.heat_type !== 'final') {
          updateData.score = 0;
        }
      }

      const result = await adminWrite<HeatParticipant[]>('heat_participants', 'update', {
        values: updateData,
        match: { id },
      });
      return result?.[0];
    },
    retry: 1,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['heat_participants'] });
      queryClient.invalidateQueries({ queryKey: ['all_heat_participants'] });
    },
  });
};

export const useDeleteHeatParticipant = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await adminWrite('heat_participants', 'delete', { match: { id } });
    },
    retry: 1,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['heat_participants'] });
      queryClient.invalidateQueries({ queryKey: ['all_heat_participants'] });
    },
  });
};

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { adminWrite } from '@/integrations/admin/adminWrite';
import { Championship } from '@/types/database';

export const useChampionships = (enabled: boolean = true, championshipId?: string, tenantId?: string) => {
  return useQuery({
    queryKey: ['championships', championshipId ?? 'all', tenantId ?? 'all-tenants'],
    queryFn: async () => {
      let query = supabase
        .from('championships')
        .select('*')
        .order('created_at', { ascending: false });

      if (tenantId) {
        query = query.eq('tenant_id', tenantId);
      } else if (championshipId) {
        query = query.eq('id', championshipId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Championship[];
    },
    enabled,
    staleTime: 1000 * 60 * 30,
    gcTime: 1000 * 60 * 10,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchInterval: false,
    retry: 1,
  });
};

export const useCreateChampionship = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (championship: Omit<Championship, 'id' | 'created_at' | 'updated_at'>) => {
      const data = await adminWrite<Championship[]>('championships', 'insert', { values: championship });
      return data?.[0];
    },
    retry: 1,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['championships'] });
    },
  });
};

export const useUpdateChampionship = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<Championship> & { id: string }) => {
      const result = await adminWrite<Championship[]>('championships', 'update', {
        values: data,
        match: { id },
      });
      return result?.[0];
    },
    retry: 1,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['championships'] });
    },
  });
};

export const useDeleteChampionship = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await adminWrite('championships', 'delete', { match: { id } });
    },
    retry: 1,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['championships'] });
    },
  });
};

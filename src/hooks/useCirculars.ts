import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { adminWrite } from '@/integrations/admin/adminWrite';
import { Circular } from '@/types/database';

export const useCirculars = (enabled: boolean = true) => {
  return useQuery({
    queryKey: ['circulars'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('circulars')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Circular[];
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

export const useCreateCircular = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (circular: Omit<Circular, 'id' | 'created_at' | 'updated_at'>) => {
      const data = await adminWrite<Circular[]>('circulars', 'insert', { values: circular });
      return data?.[0];
    },
    retry: 1,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['circulars'] });
    },
  });
};

export const useUpdateCircular = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<Circular> & { id: string }) => {
      const result = await adminWrite<Circular[]>('circulars', 'update', {
        values: data,
        match: { id },
      });
      return result?.[0];
    },
    retry: 1,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['circulars'] });
    },
  });
};

export const useDeleteCircular = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await adminWrite('circulars', 'delete', { match: { id } });
    },
    retry: 1,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['circulars'] });
    },
  });
};

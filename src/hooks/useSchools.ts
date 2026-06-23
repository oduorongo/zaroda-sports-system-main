import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { adminWrite } from '@/integrations/admin/adminWrite';
import { School } from '@/types/database';

const getSchoolChampionshipId = (zoneValue?: string | null) => {
  const raw = (zoneValue || '').trim();
  if (!raw.includes('|')) return '';

  const parts = raw.split('|');
  for (const part of parts) {
    const [key, value] = part.split(':');
    if (!key || !value) continue;
    if (key.trim().toLowerCase() === 'championship') {
      return value.trim();
    }
  }

  return '';
};

export const useSchools = (enabled: boolean = true, championshipId?: string) => {
  return useQuery({
    queryKey: ['schools', championshipId ?? 'all-championships'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('schools')
        .select('*')
        .order('name');
      if (error) throw error;

      const schools = (data ?? []) as School[];
      if (!championshipId) return schools;

      return schools.filter((school) => getSchoolChampionshipId(school.zone) === championshipId);
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

export const useCreateSchool = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (school: Omit<School, 'id' | 'created_at' | 'updated_at'>) => {
      const data = await adminWrite<School[]>('schools', 'insert', { values: school });
      return data?.[0];
    },
    retry: 1,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schools'] });
    },
  });
};

export const useUpdateSchool = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...school }: Partial<School> & { id: string }) => {
      const data = await adminWrite<School[]>('schools', 'update', { values: school, match: { id } });
      return data?.[0];
    },
    retry: 1,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schools'] });
    },
  });
};

export const useDeleteSchool = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      // Clear optional team references in match pools before deleting the team.
      await adminWrite('match_pools', 'update', {
        values: { team_a_school_id: null },
        match: { team_a_school_id: id },
      });
      await adminWrite('match_pools', 'update', {
        values: { team_b_school_id: null },
        match: { team_b_school_id: id },
      });
      await adminWrite('match_pools', 'update', {
        values: { winner_school_id: null },
        match: { winner_school_id: id },
      });

      await adminWrite('schools', 'delete', { match: { id } });
    },
    retry: 1,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schools'] });
      queryClient.invalidateQueries({ queryKey: ['match_pools'] });
    },
  });
};

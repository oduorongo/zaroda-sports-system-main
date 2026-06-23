import { CompetitionLevel, LEVEL_LABELS } from '@/types/database';

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const LEVEL_SUFFIX_PATTERN = new RegExp(
  `\s*[-–—]\s*(${Object.values(LEVEL_LABELS).map(escapeRegExp).join('|')})$`,
  'i',
);

export const stripChampionshipLevelSuffix = (name: string) => {
  return name.trim().replace(LEVEL_SUFFIX_PATTERN, '').trim();
};

export const formatChampionshipName = (name: string, level: CompetitionLevel) => {
  const baseName = stripChampionshipLevelSuffix(name);
  const levelLabel = LEVEL_LABELS[level] || level;
  return baseName ? `${baseName} - ${levelLabel}` : levelLabel;
};
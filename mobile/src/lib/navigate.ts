import { router } from 'expo-router';
import type { SectionKind } from '@/content';

/** A wird opens the counted reader; any other section opens its reading list. */
export const openSection = (id: string, kind: SectionKind) => router.push(kind === 'wird' ? `/read/${id}` : `/list/${id}`);

import { supabase } from '../lib/supabase';

export interface Release {
  id: string;
  author_id: string;
  version: string;
  slug: string;
  title: string;
  content: string;
  published: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export type ReleaseSummary = Pick<
  Release,
  | 'id'
  | 'version'
  | 'slug'
  | 'title'
  | 'published'
  | 'published_at'
  | 'updated_at'
>;

export function generateReleaseSlug(version: string): string {
  const base = version
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9.\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
  return base;
}

export async function getPublishedReleases(): Promise<Release[]> {
  const { data, error } = await supabase
    .from('releases')
    .select('*')
    .eq('published', true)
    .order('published_at', { ascending: false });

  if (error) throw error;
  return data as Release[];
}

export async function getReleaseBySlug(slug: string): Promise<Release | null> {
  const { data, error } = await supabase
    .from('releases')
    .select('*')
    .eq('slug', slug)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data as Release;
}

export async function getAllReleases(): Promise<Release[]> {
  const { data, error } = await supabase
    .from('releases')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as Release[];
}

export async function createRelease(
  release: Omit<Release, 'id' | 'created_at' | 'updated_at'>
): Promise<Release> {
  const { data, error } = await supabase
    .from('releases')
    .insert(release)
    .select()
    .single();

  if (error) throw error;
  return data as Release;
}

export async function updateRelease(
  id: string,
  updates: Partial<Omit<Release, 'id' | 'created_at' | 'updated_at'>>
): Promise<Release> {
  const { data, error } = await supabase
    .from('releases')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as Release;
}

export async function deleteRelease(id: string): Promise<void> {
  const { error } = await supabase
    .from('releases')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

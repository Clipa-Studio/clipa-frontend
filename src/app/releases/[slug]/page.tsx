import type { Metadata } from 'next'
import { supabase } from '../../../lib/supabase'
import type { Release } from '../../../lib/releases'
import ReleaseDetailClient from './ReleaseDetailClient'

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params

  const { data: release } = await supabase
    .from('releases')
    .select('version, title')
    .eq('slug', slug)
    .eq('published', true)
    .maybeSingle()

  if (!release) {
    return {
      title: 'Release Not Found',
      robots: {
        index: false,
        follow: false,
      },
    }
  }

  const title = `v${release.version} - ${release.title}`

  return {
    title,
    description: release.title,
    alternates: {
      canonical: `/releases/${slug}`,
    },
    openGraph: {
      title,
      description: release.title,
      url: `/releases/${slug}`,
      type: 'article',
    },
  }
}

export default async function ReleaseDetailPage({ params }: Props) {
  const { slug } = await params

  const { data: release } = await supabase
    .from('releases')
    .select('*')
    .eq('slug', slug)
    .eq('published', true)
    .maybeSingle()

  return <ReleaseDetailClient initialRelease={release as Release | null} />
}

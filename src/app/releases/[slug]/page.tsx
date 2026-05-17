import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getPublishedReleaseBySlug, getPublishedReleaseSummaries } from '../../../lib/publicContent'
import ReleaseDetailClient from './ReleaseDetailClient'

export const revalidate = 60

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateStaticParams() {
  const releases = await getPublishedReleaseSummaries()
  return releases.map((release) => ({ slug: release.slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params

  const release = await getPublishedReleaseBySlug(slug)

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

  const release = await getPublishedReleaseBySlug(slug)
  if (!release) notFound()

  return <ReleaseDetailClient initialRelease={release} />
}

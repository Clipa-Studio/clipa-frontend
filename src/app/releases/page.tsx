import type { Metadata } from 'next'
import { getPublishedReleaseBySlug, getPublishedReleaseSummaries } from '../../lib/publicContent'
import ReleaseListClient from './ReleaseListClient'

export const revalidate = 60

export const metadata: Metadata = {
  title: 'Releases',
  description: 'See what\'s new in each version of Clipa.',
  alternates: { canonical: '/releases' },
}

export default async function ReleasesPage() {
  const releases = await getPublishedReleaseSummaries()
  const latestRelease = releases[0]
    ? await getPublishedReleaseBySlug(releases[0].slug)
    : null

  return <ReleaseListClient initialReleases={releases} latestRelease={latestRelease} />
}

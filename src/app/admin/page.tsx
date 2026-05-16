import type { Metadata } from 'next'
import AdminDashboardClient from './AdminDashboardClient'

export const metadata: Metadata = {
  title: 'Admin',
}

export default function AdminPage() {
  return <AdminDashboardClient />
}

import type { Metadata } from 'next'
import AdminDashboardClient from './AdminDashboardClient'

export const metadata: Metadata = {
  title: '관리자',
}

export default function AdminPage() {
  return <AdminDashboardClient />
}

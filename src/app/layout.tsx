import type { Metadata } from 'next'
import { Providers } from '@/components/providers'

export const metadata: Metadata = {
  title: 'Hubbly - Q&A for Everyone',
  description: 'Real-time Q&A platform for events, meetings, and presentations',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}
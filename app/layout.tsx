import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { PeriodProvider } from '@/components/PeriodContext'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Attar Shop - Business Tracker',
  description: 'Track purchases, sales, profits, partner shares and stock for your attar & perfume shop.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} antialiased bg-[#030b16] text-[#f5f0e8]`}>
        <PeriodProvider>{children}</PeriodProvider>
      </body>
    </html>
  )
}

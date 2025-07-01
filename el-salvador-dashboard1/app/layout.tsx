import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Monitoreo - Conectando El Salvador',
  description: 'Created with IA (Insomnio y Ansiedad)',
  generator: 'Pvrker - 2025',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}

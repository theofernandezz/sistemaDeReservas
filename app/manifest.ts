import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Buki - Sistema de Reservas',
    short_name: 'Buki',
    description: 'Plataforma de reservas online para profesionales',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#f97316',
    icons: [
      {
        src: '/logo/icon.png',
        sizes: 'any',
        type: 'image/png',
      },
    ],
  }
}

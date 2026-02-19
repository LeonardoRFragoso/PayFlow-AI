import '../styles/globals.css'
import type { AppProps } from 'next/app'
import Analytics from '../components/Analytics'
import { ThemeProvider } from '../contexts/ThemeContext'
import { useEffect } from 'react'
import { useRouter } from 'next/router'
import { pageview } from '../utils/analytics'

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter()

  useEffect(() => {
    const handleRouteChange = (url: string) => {
      pageview(url)
    }
    router.events.on('routeChangeComplete', handleRouteChange)
    return () => {
      router.events.off('routeChangeComplete', handleRouteChange)
    }
  }, [router.events])

  return (
    <ThemeProvider>
      <Analytics />
      <Component {...pageProps} />
    </ThemeProvider>
  )
}

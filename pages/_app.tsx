import '../styles/globals.css'
import type { AppProps } from 'next/app'
import { useEffect } from 'react'

export default function App({ Component, pageProps }: AppProps) {
  useEffect(() => {
    // Force dark mode always - remove light mode class if present
    const forceDarkMode = () => {
      document.documentElement.classList.add('dark')
      document.documentElement.classList.remove('light')
      document.documentElement.setAttribute('data-theme', 'dark')
      // Also set on body to ensure it's applied
      if (document.body) {
        document.body.classList.add('dark')
        document.body.classList.remove('light')
      }
    }
    
    // Force immediately - run on mount and after a short delay to catch any late changes
    forceDarkMode()
    const timeoutId = setTimeout(forceDarkMode, 0)
    
    // Prevent any theme switching
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
          forceDarkMode()
        }
      })
    })
    
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    })
    
    // Also observe body in case theme is set there
    if (document.body) {
      observer.observe(document.body, {
        attributes: true,
        attributeFilter: ['class']
      })
    }
    
    return () => {
      clearTimeout(timeoutId)
      observer.disconnect()
    }
  }, [])

  return <Component {...pageProps} />
}

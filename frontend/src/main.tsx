import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Capacitor } from '@capacitor/core'
import { SplashScreen } from '@capacitor/splash-screen'
import { StatusBar, Style } from '@capacitor/status-bar'
import './index.css'
import App from './App.tsx'

async function bootstrap() {
  if (Capacitor.isNativePlatform()) {
    StatusBar.setStyle({ style: Style.Light })
    StatusBar.setBackgroundColor({ color: '#4f46e5' })
  }

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )

  if (Capacitor.isNativePlatform()) {
    await SplashScreen.hide()
  }
}

bootstrap()

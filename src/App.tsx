import { useState, useEffect } from 'react'
import Dashboard from './pages/Dashboard'

function App() {
  const [currentTime, setCurrentTime] = useState<string>('')

  // Update time for footer
  useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      setCurrentTime(now.toLocaleTimeString())
    }
    
    updateTime()
    const interval = setInterval(updateTime, 1000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 text-white">
      {/* Animated background gradient */}
      <div className="fixed inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-purple-500/5 pointer-events-none" />
      
      <div className="relative container mx-auto px-4 py-8">
        {/* Header with animation */}
        <header className="mb-8 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 animate-gradient">
            Injective Protocol Mini Dashboard
          </h1>
          <div className="flex items-center justify-center gap-2 text-gray-400">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <p className="text-sm md:text-base">
              Real-time market data from Injective Testnet
            </p>
          </div>
          
          {/* Market stats badge */}
          <div className="mt-4 inline-flex items-center gap-2 bg-gray-800/50 backdrop-blur-sm px-4 py-2 rounded-full border border-gray-700/50 text-xs md:text-sm">
            <span className="text-blue-400">⚡ Live</span>
            <span className="text-gray-600">|</span>
            <span className="text-gray-300">Spot Markets</span>
            <span className="text-gray-600">|</span>
            <span className="text-purple-400">24/7</span>
          </div>
        </header>

        {/* Main Dashboard */}
        <Dashboard />

        {/* Footer */}
        <footer className="mt-12 text-center text-gray-500 text-sm border-t border-gray-800/50 pt-8">
          <div className="flex flex-col md:flex-row items-center justify-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-blue-400">⚡</span>
              <span>Connected to Injective Testnet</span>
            </div>
            
            <div className="hidden md:block w-px h-4 bg-gray-800" />
            
            <div className="flex items-center gap-2">
              <span className="text-purple-400">🔄</span>
              <span>Updates every 3 seconds</span>
            </div>
            
            <div className="hidden md:block w-px h-4 bg-gray-800" />
            
            <div className="flex items-center gap-2">
              <span className="text-green-400">⏱️</span>
              <span>{currentTime || 'Loading...'}</span>
            </div>
          </div>
          
          <div className="mt-6 flex items-center justify-center gap-6">
            <a 
              href="https://injective.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-gray-500 hover:text-blue-400 transition-colors"
            >
              Website
            </a>
            <a 
              href="https://docs.injective.network" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-gray-500 hover:text-purple-400 transition-colors"
            >
              Documentation
            </a>
            <a 
              href="https://github.com/InjectiveLabs" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-gray-500 hover:text-pink-400 transition-colors"
            >
              GitHub
            </a>
          </div>
          
          <p className="mt-6 text-xs text-gray-600">
            Built for the Injective Africa Builderthon • {new Date().getFullYear()}
          </p>
        </footer>
      </div>

      {/* Add gradient animation styles */}
      <style>{`
        @keyframes gradient {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .animate-gradient {
          background-size: 200% 200%;
          animation: gradient 8s ease infinite;
        }
      `}</style>
    </div>
  )
}

export default App
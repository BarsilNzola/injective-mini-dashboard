import Dashboard from './pages/Dashboard'

function App() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-950 text-white">
      <div className="container mx-auto px-4 py-8">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-center mb-2 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
            Injective Protocol Mini Dashboard
          </h1>
          <p className="text-center text-gray-400">
            Real-time market data from Injective Testnet
          </p>
        </header>
        <Dashboard />
        <footer className="mt-12 text-center text-gray-500 text-sm">
          <p>Connected to Injective Testnet • Data updates every 3 seconds</p>
          <p className="mt-2">Built for Injective Hackathon</p>
        </footer>
      </div>
    </div>
  )
}

export default App
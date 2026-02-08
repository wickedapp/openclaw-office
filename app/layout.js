import './globals.css'

export const metadata = {
  title: 'OpenClaw Office',
  description: 'OpenClaw Office Dashboard',
}

function NavBar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-sm border-b border-cyan-500/30">
      <div className="max-w-7xl mx-auto px-4 h-12 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <span className="text-cyan-400 font-bold text-lg">OpenClaw</span>
          <a href="#" className="text-gray-300 hover:text-cyan-400 transition-colors text-sm">
            🏢 Office
          </a>
          <a href="#" className="text-gray-300 hover:text-cyan-400 transition-colors text-sm">
            📋 Tasks
          </a>
        </div>
        <div className="text-gray-500 text-xs">
          AI-Powered Operations
        </div>
      </div>
    </nav>
  )
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-screen cyber-grid relative">
        <div className="cyber-rain" />
        <NavBar />
        <div className="pt-12">
          {children}
        </div>
      </body>
    </html>
  )
}

interface LoaderProps {
  size?: 'sm' | 'md' | 'lg'
  text?: string
  fullPage?: boolean
}

export default function Loader({ size = 'md', text = 'Loading...', fullPage = false }: LoaderProps) {
  const sizeClasses = {
    sm: 'h-4 w-4 border-2',
    md: 'h-8 w-8 border-2',
    lg: 'h-12 w-12 border-3',
  }

  const containerClasses = fullPage 
    ? 'fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-50 flex justify-center items-center'
    : 'flex justify-center items-center p-8'

  return (
    <div className={containerClasses}>
      <div className={`animate-spin rounded-full ${sizeClasses[size]} border-b-2 border-blue-500`}></div>
      {text && <span className="ml-3 text-gray-400">{text}</span>}
    </div>
  )
}
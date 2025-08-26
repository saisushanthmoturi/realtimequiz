interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  color?: string;
  text?: string;
}

export default function LoadingSpinner({ 
  size = 'md', 
  color = 'blue-600',
  text = 'Loading...'
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12'
  };

  return (
    <div className="flex flex-col items-center justify-center">
      <div className={`animate-spin rounded-full border-b-2 border-${color} ${sizeClasses[size]}`}></div>
      {text && <p className="text-gray-600 mt-2">{text}</p>}
    </div>
  );
}

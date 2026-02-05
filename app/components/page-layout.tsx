interface PageLayoutProps {
  children: React.ReactNode;
  maxWidth?: 'md' | 'lg' | 'xl' | '2xl' | '4xl' | 'full';
  className?: string;
}

const maxWidthClasses = {
  md: 'max-w-3xl',
  lg: 'max-w-4xl',
  xl: 'max-w-6xl',
  '2xl': 'max-w-7xl',
  '4xl': 'max-w-[90rem]',
  full: 'max-w-full',
};

export function PageLayout({ children, maxWidth = 'lg', className }: PageLayoutProps) {
  return (
    <main className={`min-h-screen bg-app-bg overflow-x-clip ${className ?? ''}`}>
      <div className={`mx-auto ${maxWidthClasses[maxWidth]} px-6 py-24`}>
        {children}
      </div>
    </main>
  );
}

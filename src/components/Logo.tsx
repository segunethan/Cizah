interface LogoProps {
  /** 'light' = dark text (for light backgrounds), 'dark' = white text (for dark backgrounds) */
  variant?: 'light' | 'dark';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}

const heights: Record<string, string> = {
  xs: 'h-5',
  sm: 'h-7',
  md: 'h-8',
  lg: 'h-10',
};

export function Logo({ variant = 'light', size = 'md', className = '' }: LogoProps) {
  const src = variant === 'dark' ? '/cizah-logo-dark.png' : '/cizah-logo.png';
  return (
    <img
      src={src}
      alt="Cizah"
      className={`${heights[size]} w-auto object-contain ${className}`}
    />
  );
}

const iconSizes: Record<string, string> = {
  xs: 'h-6 w-6',
  sm: 'h-8 w-8',
  md: 'h-9 w-9',
  lg: 'h-12 w-12',
};

export function LogoIcon({ size = 'md', className = '' }: { size?: 'xs' | 'sm' | 'md' | 'lg'; className?: string }) {
  return (
    <img
      src="/cizah-icon-192.png"
      alt="Cizah"
      className={`${iconSizes[size]} object-contain ${className}`}
    />
  );
}

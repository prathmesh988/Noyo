import React, { forwardRef } from 'react';

/**
 * Noyo Logo Component
 * Primary client brand: Noyo | Platform Agency: Appzeto
 * Uses /noyo-logo.svg (full brand + Powered by Appzeto) and /noyo-icon.svg (compact emblem)
 * Usage: <Logo className="h-10 w-auto" /> or <Logo iconOnly={true} className="w-8 h-8" />
 */
const Logo = forwardRef(({ className = "h-12 w-auto", iconOnly = false, alt = "Noyo - Powered by Appzeto", ...props }, ref) => {
  return (
    <img
      ref={ref}
      src={iconOnly ? "/noyo-icon.svg" : "/noyo-logo.svg"}
      alt={alt}
      className={className}
      {...props}
    />
  );
});

Logo.displayName = 'Logo';

export default Logo;

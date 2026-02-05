'use client';

import { useState } from 'react';
import { Link, Check } from 'lucide-react';

interface HeadingLinkProps {
  id?: string;
  children: React.ReactNode;
  as: 'h1' | 'h2' | 'h3';
  className?: string;
}

export function HeadingLink({ id, children, as: Component, className }: HeadingLinkProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyLink = () => {
    if (!id) return;
    
    const url = `${window.location.origin}${window.location.pathname}#${id}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Component id={id} className={`group relative ${className}`}>
      {children}
      {id && (
        <button
          onClick={handleCopyLink}
          className="inline-flex items-center justify-center ml-2 opacity-0 group-hover:opacity-100 transition-opacity text-faded hover:text-subtitle"
          aria-label="Copy link to section"
        >
          {copied ? (
            <Check className="w-4 h-4" />
          ) : (
            <Link className="w-4 h-4" />
          )}
        </button>
      )}
    </Component>
  );
}

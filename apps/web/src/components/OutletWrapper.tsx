import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface OutletWrapperProps {
  children: React.ReactNode;
}

// const listToHide = ['/auth/*', '/auth'];

export function OutletWrapper({ children }: OutletWrapperProps) {
  const [mounted, setMounted] = useState(false);

  // Calculate width based on sidebar width from DOM
  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <motion.div
      className="flex-1 relative max-sm:mt-12 w-full min-w-0"
      initial={{ opacity: 0 }}
      animate={{ opacity: mounted ? 1 : 0 }}
      transition={{ delay: .3, duration: 0.5 }}
    >
      {children}
    </motion.div>
  );
}

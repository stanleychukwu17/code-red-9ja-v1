import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";

interface OutletWrapperProps {
  children: React.ReactNode;
}

export function OutletWrapper({ children }: OutletWrapperProps) {
  const [mounted, setMounted] = useState(false);

  // fades the page in after the page has been rendered
  useEffect(() => { setMounted(true); }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: mounted ? 1 : 0 }}
      transition={{ delay: 0.3, duration: 0.5 }}
    >
      {children}
    </motion.div>
  );
}

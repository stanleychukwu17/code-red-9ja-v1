import React from "react";
interface OutletWrapperProps {
  children: React.ReactNode;
}

export function OutletWrapper({ children }: OutletWrapperProps) {
  return <div className="flex-1">{children}</div>;
}

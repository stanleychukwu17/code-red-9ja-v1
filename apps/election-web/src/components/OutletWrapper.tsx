import React, { useEffect, useState } from "react";
import { useAppSelector, useAppDispatch } from "@/redux/hooks";
import { updateSiteState } from "@/redux/slice/siteSlice";
import { useIsMobile } from "@repo/ui/hooks/useMobile";

interface OutletWrapperProps {
  children: React.ReactNode;
}


export function OutletWrapper({ children }: OutletWrapperProps) {
  return <div className="flex-1">{children}</div>;
}

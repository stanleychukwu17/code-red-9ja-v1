import * as React from "react";
import { useMediaQuery } from "usehooks-ts";
import { useNavigate } from "@tanstack/react-router";
import {
  Drawer,
  DrawerContent,
  DrawerTitle,
  DrawerDescription,
} from "@repo/ui/components/drawer";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogCloseButton,
} from "@repo/ui/components/dialog";
import { Button } from "@repo/ui/components/button";
import LogoIcon from "@repo/ui/icons/logo-icon";

interface AuthModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  redirectUrl?: string;
}

export function AuthModal({
  isOpen,
  onOpenChange,
  redirectUrl,
}: AuthModalProps) {
  const navigate = useNavigate();
  const [mounted, setMounted] = React.useState(false);
  const isDesktop = useMediaQuery("(min-width: 768px)");

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const handleSignUp = () => {
    onOpenChange(false);
    navigate({
      to: "/auth/signup" as any,
      search: (redirectUrl ? { redirect: redirectUrl } : undefined) as any,
    });
  };

  const handleLogin = () => {
    onOpenChange(false);
    navigate({
      to: "/auth/login" as any,
      search: (redirectUrl ? { redirect: redirectUrl } : undefined) as any,
    });
  };

  const ModalBody = (
    <div className="flex flex-col flex-1 px-5 pt-1 pb-7 w-full max-w-[390px] mx-auto select-none">
      {/* Top Close Button */}
      <div className="flex items-center justify-end w-full pt-1 pb-1">
        <DialogCloseButton onClick={() => onOpenChange(false)} />
      </div>

      {/* Free9ja Eagle Logo */}
      <div className="flex justify-center mb-3">
        <LogoIcon className="size-12 text-primary shrink-0" />
      </div>

      {/* Headline */}
      <div className="text-center mb-6">
        <h2 className="text-[27px] md:text-[29px] font-extrabold text-neutral-900 tracking-tight leading-tight">
          Sign up to Free9ja
        </h2>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col gap-3 w-full">
        <Button
          type="button"
          variant="secondary"
          size="4xl"
          className="w-full rounded-full"
          onClick={handleSignUp}
        >
          Sign up
        </Button>

        <Button
          type="button"
          variant="grey"
          size="4xl"
          className="w-full rounded-full"
          onClick={handleLogin}
        >
          <span className="text-neutral-500 font-normal">or</span>
          <span className="text-[#1a5b41] font-bold">Login</span>
        </Button>
      </div>

      {/* Legal Disclaimer */}
      <p className="text-[13px] text-neutral-500 leading-relaxed text-center px-2 mt-8">
        By continuing you agree to our{" "}
        <a
          href="/terms"
          target="_blank"
          rel="noreferrer"
          className="text-[#1a5b41] font-bold hover:underline"
        >
          Terms of Service
        </a>{" "}
        and acknowledge that you have read our{" "}
        <a
          href="/privacy"
          target="_blank"
          rel="noreferrer"
          className="text-[#1a5b41] font-bold hover:underline"
        >
          Privacy Policy
        </a>
        .
      </p>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="max-w-[420px] rounded-[32px] p-2 overflow-hidden border-none bg-white shadow-2xl"
      >
        <DialogTitle className="sr-only">Sign up to Free9ja</DialogTitle>
        <DialogDescription className="sr-only">
          Create an account or login to continue.
        </DialogDescription>
        {ModalBody}
      </DialogContent>
    </Dialog>
  );
}

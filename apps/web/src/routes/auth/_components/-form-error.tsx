import { motion, AnimatePresence } from "framer-motion";
import { PiWarningCircleDuotone } from "react-icons/pi";

interface FormErrorProps {
  message: string | null;
}

export const FormError = ({ message }: FormErrorProps) => {
  return (
    <AnimatePresence mode="wait">
      {message && (
        <motion.div
          initial={{ opacity: 0, y: -10, height: 0 }}
          animate={{ opacity: 1, y: 0, height: "auto" }}
          exit={{ opacity: 0, y: -10, height: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="overflow-hidden"
        >
          <div className="flex items-center gap-3 p-4 mb-4 bg-destructive/10 border border-destructive/20 rounded-xl backdrop-blur-sm">
            <div className="shrink-0">
              <PiWarningCircleDuotone className="size-5 text-destructive" />
            </div>
            <p className="text-sm font-medium text-destructive leading-tight">
              {message}
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

import * as React from "react";

import { ArrowUp, Eye, EyeOff } from "lucide-react";
import TextareaAutosize, {
  TextareaAutosizeProps,
} from "react-textarea-autosize";
import PaperPlaneIcon from "../icons/paper-plane-icon";
import SearchIcon from "../icons/search-icon";
import { cn } from "../lib/utils";
import { Button } from "./button";

const inputClassName =
  "group flex items-center gap-2 h-14 w-full rounded-[16px] bg-black/5 px-4 py-1 text-lg transition-colors duration-200 file:border-0 file:bg-transparent file: file:font-medium ring-inset file:text-foreground placeholder:text-c-60 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50";

const fancyInputClassName =
  "bg-transparent hover:bg-transparent! text-2xl md:text-xl text-c-80 font-semibold px-0 hover:ring-0 hover:bg-background focus-visible:ring-0";

type InputProps = React.ComponentProps<"input"> & {
  icon?: React.ReactNode;
  errorMsg?: string;
};

const Input = ({ className, type, ref, errorMsg, ...props }: InputProps) => {
  return (
    <input
      type={type}
      className={cn(inputClassName, className, errorMsg && "border border-red")}
      ref={ref}
      autoComplete="off"
      {...props}
    />
  );
};

const FancyInput = ({
  className,
  type,
  ref,
  ...props
}: InputProps & { errorMsg?: string }) => {
  return (
    <input
      type={type}
      className={cn(
        inputClassName,
        fancyInputClassName,
        props.errorMsg && "placeholder:text-red/50",
        className,
      )}
      ref={ref}
      autoComplete="off"
      {...props}
    />
  );
};

const IconInput = ({
  className,
  innerClassName,
  icon,
  type,
  ref,
  ...props
}: InputProps & { innerClassName?: string }) => {
  return (
    <div
      className={cn(
        inputClassName,
        "focus-within:ring-primary focus-within:ring-1 focus-within:hover:ring-primary",
        className,
      )}
    >
      <div className="mb-px">
        {icon ?? <SearchIcon className={"text-c-50"} />}
      </div>
      <input
        type={type}
        ref={ref}
        autoComplete="off"
        {...props}
        className={cn(
          "outline-hidden w-full group-hover:bg-input-active placeholder:text-c-60 transition-colors duration-200 bg-transparent",
          innerClassName,
        )}
      />
    </div>
  );
};

type InputErrorTextProps = {
  text?: string;
  className?: string;
};
const InputErrorText = ({ text, className }: InputErrorTextProps) => {
  if (!text) return <></>;

  return (
    <p className={cn("text-red-500 text-sm font-medium", className)}>{text}</p>
  );
};

const FormInput = ({
  className,
  type,
  labelText,
  errorMsg,
  ref,
  ...props
}: InputProps & { labelText?: string }) => {
  return (
    <div className="space-y-1 w-full">
      <Label title={labelText} className="mb-2.5" />
      <input
        type={type}
        className={cn(inputClassName, className)}
        ref={ref}
        autoComplete="off"
        {...props}
      />
      <InputErrorText text={errorMsg} />
    </div>
  );
};

const Label = ({
  title,
  className,
}: {
  title?: string;
  className?: string;
}) => {
  if (!title) return <></>;
  return <p className={cn("font-medium text-c-70", className)}>{title}</p>;
};

const textareaClassName =
  "resize-none bg-transparent hover:bg-transparent! focus-visible:ring-0 text-c-80 px-0";

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<"textarea"> & TextareaAutosizeProps
>(({ className, ...props }, ref) => {
  return (
    <TextareaAutosize
      className={cn(inputClassName, textareaClassName, className)}
      ref={ref}
      autoComplete="off"
      {...props}
    />
  );
});
Textarea.displayName = "Textarea";

const TextareaInput = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<"textarea"> &
    TextareaAutosizeProps & { errorMsg?: string }
>(({ className, errorMsg, ...props }, ref) => {
  return (
    <div
      className={cn(
        inputClassName,
        "h-fit min-h-10 py-[4px] focus-within:ring-1 ring-primary",
        errorMsg && "placeholder:text-red/50",
        className,
      )}
    >
      <Textarea ref={ref} {...props} />
    </div>
  );
});
TextareaInput.displayName = "TextareaInput";

export const TextareaInputComment = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<"textarea"> &
    TextareaAutosizeProps & { errorMsg?: string; onSubmit?: () => void }
>(({ className, errorMsg, onSubmit, ...props }, ref) => {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      const isDisabled =
        !props.value ||
        (typeof props.value === "string" && props.value.trim() === "");

      if (!isDisabled && onSubmit) {
        e.preventDefault();
        onSubmit();
      }
    }
    props.onKeyDown?.(e);
  };

  return (
    <div
      className={cn(
        "flex flex-col w-full rounded-[16px] bg-input p-3 py-2 min-h-[100px] transition-all duration-200 focus-within:bg-hover-3 focus-within:ring-0.8 ring-primary",
        errorMsg && "ring-red/50",
        className,
      )}
    >
      <Textarea
        ref={ref}
        {...props}
        onKeyDown={handleKeyDown}
        className="w-full bg-transparent text-lg md:text-[15px] placeholder:text-c-60 h-auto min-h-[40px] appearance-none"
      />
      <div className="flex justify-end mt-1">
        <Button
          variant="default"
          size="icon-md"
          className="rounded-full size-8 px-0 shadow-xs"
          onClick={onSubmit}
          disabled={
            !props.value ||
            (typeof props.value === "string" && props.value.trim() === "")
          }
        >
          <ArrowUp className="size-4 stroke-white" stroke="1.5" />
        </Button>
      </div>
    </div>
  );
});
TextareaInputComment.displayName = "TextareaInputComment";

// This textarea adjusts it's max rows based on the height of the viewport
const FancyTextarea = ({
  ...props
}: React.ComponentProps<"textarea"> &
  TextareaAutosizeProps & { errorMsg?: string }) => {
  const [maxRows, setMaxRows] = React.useState(10); // Default to a safe value

  function getMaxRows(height: number) {
    if (height < 500) return 2;
    if (height < 700) return 4;
    return 10;
  }

  React.useEffect(() => {
    if (typeof window === "undefined") return;

    // Set initial rows on mount
    setMaxRows(getMaxRows(window.innerHeight));

    const handleResize = () => {
      setMaxRows(getMaxRows(window.innerHeight));
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <Textarea
      placeholder="Type description..."
      className={cn(
        props.errorMsg && "placeholder:text-red/50",
        props.className,
        "rounded-none",
      )}
      maxRows={maxRows}
      {...props}
    />
  );
};

const TextareaComment = ({
  className,
  ref,
  ...props
}: React.ComponentProps<"textarea"> & TextareaAutosizeProps) => {
  return (
    <div
      className={cn(
        inputClassName,
        "pl-3 pr-2.5 py-2 h-fit flex-col focus-within:ring-primary focus-within:ring-1 focus-within:hover:ring-primary",
      )}
    >
      <TextareaAutosize
        className={cn(
          "resize-none focus-visible:outline-hidden w-full overflow-hidden",
          className,
        )}
        ref={ref}
        autoComplete="off"
        {...props}
      />
      <div className="flex justify-end w-full">
        <Button variant="default" size="icon-sm" className="[&_svg]:text-white">
          <PaperPlaneIcon className="size-3" />
        </Button>
      </div>
    </div>
  );
};

// Simple icon components for username validation
const CheckCircle = ({ className }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 20 20">
    <path
      fillRule="evenodd"
      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
      clipRule="evenodd"
    />
  </svg>
);

const XCircle = ({ className }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 20 20">
    <path
      fillRule="evenodd"
      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
      clipRule="evenodd"
    />
  </svg>
);

type UsernameInputProps = React.ComponentProps<"input"> & {
  checkFunction: (
    username: string,
  ) => Promise<{ available: boolean }> | { available: boolean } | null;
  validateFormat?: (username: string) => { isValid: boolean; error?: string };
  onValidationChange?: (isValid: boolean) => void;
  debounceMs?: number;
  errorMsg?: string;
  preventInvalidChars?: boolean;
};

type PasswordInputProps = React.ComponentProps<"input"> & {
  errorMsg?: string;
};

const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ className, errorMsg, ...props }, ref) => {
    const [showPassword, setShowPassword] = React.useState(false);

    const togglePasswordVisibility = () => {
      setShowPassword(!showPassword);
    };

    return (
      <div className="space-y-1 w-full">
        <div className="relative">
          <input
            ref={ref}
            type={showPassword ? "text" : "password"}
            className={cn(
              inputClassName,
              "pr-10",
              className,
              errorMsg && "border border-red",
            )}
            autoComplete="off"
            {...props}
          />
          <button
            type="button"
            className="absolute inset-y-0 right-0 flex items-center pr-3 text-c-50 hover:text-c-70 transition-colors duration-200"
            onClick={togglePasswordVisibility}
            tabIndex={-1}
          >
            {showPassword ? (
              <Eye className="h-4 w-4" />
            ) : (
              <EyeOff className="h-4 w-4" />
            )}
          </button>
        </div>
        <InputErrorText text={errorMsg} />
      </div>
    );
  },
);

PasswordInput.displayName = "PasswordInput";

const PercentageInput = React.forwardRef<
  HTMLInputElement,
  InputProps & {
    value?: number;
    onChange?: (value: number) => void;
  }
>(({ className, value, onChange, errorMsg, disabled, ...props }, ref) => {
  const [displayValue, setDisplayValue] = React.useState<string>(
    value !== undefined ? value.toString() : "",
  );

  React.useEffect(() => {
    if (value !== undefined) {
      setDisplayValue(value.toString());
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;

    // Only allow numeric input (including decimal point)
    const numericOnly = inputValue.replace(/[^0-9.]/g, "");

    // Prevent multiple decimal points
    const parts = numericOnly.split(".");
    const filteredValue =
      parts.length > 2 ? parts[0] + "." + parts.slice(1).join("") : numericOnly;

    setDisplayValue(filteredValue);

    // Parse the numeric value and call onChange
    const numericValue = parseFloat(filteredValue);
    if (!isNaN(numericValue) && onChange) {
      onChange(numericValue);
    }
  };

  const handleBlur = () => {
    // Ensure the value is a valid number on blur
    const numericValue = parseFloat(displayValue);
    if (!isNaN(numericValue)) {
      setDisplayValue(numericValue.toString());
    } else {
      setDisplayValue(value?.toString() || "");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Allow: backspace, delete, tab, escape, enter, home, end, left, right, up, down
    if (
      [8, 9, 27, 13, 46, 35, 36, 37, 38, 39, 40].indexOf(e.keyCode) !== -1 ||
      // Allow: Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X
      (e.keyCode === 65 && e.ctrlKey === true) ||
      (e.keyCode === 67 && e.ctrlKey === true) ||
      (e.keyCode === 86 && e.ctrlKey === true) ||
      (e.keyCode === 88 && e.ctrlKey === true)
    ) {
      return;
    }
    // Ensure that it is a number and stop the keypress
    if (
      (e.shiftKey || e.keyCode < 48 || e.keyCode > 57) &&
      (e.keyCode < 96 || e.keyCode > 105) &&
      e.keyCode !== 190
    ) {
      e.preventDefault();
    }
  };

  return (
    <div className="space-y-1 w-full">
      <div className="relative">
        <input
          ref={ref}
          type="text"
          className={cn(
            inputClassName,
            "pr-8",
            className,
            errorMsg && "border border-red",
          )}
          value={displayValue}
          onChange={handleChange}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          autoComplete="off"
          {...props}
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-c-60 pointer-events-none">
          %
        </div>
      </div>
      <InputErrorText text={errorMsg} />
    </div>
  );
});

PercentageInput.displayName = "PercentageInput";

type SuffixInputProps = Omit<
  React.ComponentProps<"input">,
  "value" | "onChange"
> & {
  value: number;
  suffix: string;
  onNumberChange: (value: number) => void;
  errorMsg?: string;
  containerClassName?: string;
};

const SuffixInput = ({
  value,
  suffix,
  onNumberChange,
  className,
  containerClassName,
  onFocus,
  onBlur,
  ref,
  ...props
}: SuffixInputProps) => {
  const [isFocused, setIsFocused] = React.useState(false);

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(true);
    onFocus?.(e);
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(false);
    onBlur?.(e);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value) || 0;
    onNumberChange(val);
  };

  return (
    <div className={cn("space-y-1 w-full", containerClassName)}>
      <Input
        ref={ref}
        type={isFocused ? "number" : "text"}
        className={cn(className)}
        value={isFocused ? (value === 0 ? "" : value) : `${value} ${suffix}`}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onChange={handleChange}
        {...props}
      />
      <InputErrorText text={props.errorMsg} />
    </div>
  );
};

export {
  FancyInput,
  FancyTextarea,
  FormInput,
  IconInput,
  Input,
  InputErrorText,
  Label,
  PasswordInput,
  PercentageInput,
  SuffixInput,
  Textarea,
  TextareaComment,
  TextareaInput,
};

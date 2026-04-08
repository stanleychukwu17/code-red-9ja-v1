import type { ComponentType } from 'react';
import { TextInput, type TextInputProps } from 'react-native';

import { cn } from '../lib/cn';

const StyledTextInput = TextInput as unknown as ComponentType<TextInputProps & { className?: string }>;

type TextFieldProps = TextInputProps & {
  active?: boolean;
  className?: string;
};

export function TextField({ active, className, ...props }: TextFieldProps) {
  return (
    <StyledTextInput
      className={cn(
        'h-13 rounded-2xl px-4 text-sm text-brand-deep',
        active
          ? 'border-2 border-brand bg-surface'
          : 'border border-transparent bg-surface-muted',
        className,
      )}
      placeholderTextColor="#BDB5B8"
      selectionColor="#2F7B57"
      {...props}
    />
  );
}

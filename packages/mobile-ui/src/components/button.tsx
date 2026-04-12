import type { ComponentType } from 'react';
import {
  ActivityIndicator,
  Pressable,
  Text,
  type PressableProps,
  type TextProps,
} from 'react-native';

import { cn } from '../lib/cn';

const StyledPressable = Pressable as unknown as ComponentType<PressableProps & { className?: string }>;
const StyledText = Text as unknown as ComponentType<TextProps & { className?: string }>;

type ButtonVariant = 'primary' | 'outline';

type ButtonProps = PressableProps & {
  label: string;
  variant?: ButtonVariant;
  loading?: boolean;
  className?: string;
  textClassName?: string;
};

export function Button({
  label,
  variant = 'primary',
  loading,
  disabled,
  className,
  textClassName,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <StyledPressable
      disabled={isDisabled}
      className={cn(
        'h-13 w-full flex-row items-center justify-center rounded-full px-4',
        variant === 'primary' ? 'bg-brand' : 'border border-line bg-white',
        isDisabled && 'opacity-60',
        className,
      )}
      {...props}>
      {loading ? (
        <ActivityIndicator
          color={variant === 'primary' ? '#FFFFFF' : '#2F7B57'}
          style={{ marginRight: 8 }}
        />
      ) : null}
      <StyledText
        className={cn(
          'text-base font-bold',
          variant === 'primary' ? 'text-white' : 'text-brand-deep',
          textClassName,
        )}>
        {label}
      </StyledText>
    </StyledPressable>
  );
}

import { cn } from '@/lib/utils';
import * as React from 'react';
import { Platform, TextInput, type TextInputProps } from 'react-native';

const Input = React.forwardRef<TextInput, TextInputProps>(function Input({ className, multiline, ...props }, ref) {
  return (
    <TextInput
      ref={ref}
      multiline={multiline}
      className={cn(
        'dark:bg-input/30 border-input bg-background text-foreground w-full min-w-0 rounded-md border px-3 text-base leading-5 shadow-sm shadow-black/5',
        multiline
          ? 'min-h-24 h-auto shrink-0 py-3'
          : 'flex h-10 min-h-10 flex-row items-center py-1 sm:h-9',
        props.editable === false &&
        cn(
          'opacity-50',
          Platform.select({ web: 'disabled:pointer-events-none disabled:cursor-not-allowed' })
        ),
        Platform.select({
          web: cn(
            'placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground outline-none transition-[color,box-shadow] md:text-sm',
            'focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50',
            'aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive'
          ),
          native: 'placeholder:text-muted-foreground/50',
        }),
        className
      )}
      {...props}
    />
  );
});

Input.displayName = 'Input';

export { Input };

import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-2xl text-sm font-medium transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 active:scale-[0.98]",
  {
    variants: {
      variant: {
        default: "primary-gradient text-primary-foreground shadow-primary hover:shadow-elevated hover:scale-[1.02]",
        destructive:
          "bg-destructive text-destructive-foreground shadow-md hover:bg-destructive/90",
        outline:
          "border-2 border-primary/20 bg-background hover:bg-primary/5 hover:border-primary/40 text-foreground",
        secondary:
          "success-gradient text-secondary-foreground shadow-md hover:shadow-elevated hover:scale-[1.02]",
        ghost: "hover:bg-primary/5 hover:text-primary",
        link: "text-primary underline-offset-4 hover:underline",
        accent: "accent-gradient text-accent-foreground shadow-accent hover:shadow-elevated hover:scale-[1.02]",
        modern: "bg-card border-2 border-border/50 hover:border-primary/30 hover:bg-primary/5 text-foreground shadow-card hover:shadow-elevated",
        shipfy: "primary-gradient text-primary-foreground shadow-primary hover:shadow-elevated transform transition-all duration-300 hover:-translate-y-0.5",
        jobfast: "primary-gradient text-primary-foreground shadow-primary hover:shadow-elevated transform transition-all duration-300 hover:-translate-y-0.5",
      },
      size: {
        default: "h-11 px-6 py-3",
        sm: "h-9 rounded-xl px-4 text-xs",
        lg: "h-14 rounded-2xl px-8 py-4 text-base font-semibold",
        xl: "h-16 rounded-3xl px-10 py-5 text-lg font-semibold",
        icon: "h-11 w-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }

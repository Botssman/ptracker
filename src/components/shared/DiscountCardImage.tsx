"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { CreditCard } from "lucide-react";

interface DiscountCardImageProps {
  src: string | null;
  className?: string;
  size?: "sm" | "md" | "lg";
}

const sizeClasses = {
  sm: "w-24 h-24",
  md: "w-32 h-32",
  lg: "w-40 h-40 sm:w-48 sm:h-48",
};

export function DiscountCardImage({ src, className = "", size = "md" }: DiscountCardImageProps) {
  const [open, setOpen] = useState(false);

  if (!src) {
    return (
      <div className={`${sizeClasses[size]} rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border shrink-0 ${className}`}>
        <CreditCard className="h-10 w-10 text-primary/40" />
      </div>
    );
  }

  return (
    <>
      <div
        className={`${sizeClasses[size]} rounded-lg border shrink-0 overflow-hidden cursor-zoom-in hover:ring-2 hover:ring-primary/50 transition-all ${className}`}
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
      >
        <img
          src={src}
          alt="Дисконтная карта"
          className="w-full h-full object-cover"
        />
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg p-0 overflow-hidden bg-black/90 border-none">
          <DialogTitle className="sr-only">Дисконтная карта</DialogTitle>
          <img
            src={src}
            alt="Дисконтная карта"
            className="w-full h-auto cursor-zoom-out"
            onClick={() => setOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}

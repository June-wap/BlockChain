"use client";

import React from "react";
import { Modal } from "./Modal";
import { Button } from "./Button";
import {
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Info,
} from "lucide-react";

export interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "warning" | "info" | "success";
  isLoading?: boolean;
}

export const Dialog: React.FC<DialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "info",
  isLoading = false,
}) => {
  const iconConfig = {
    danger: {
      icon: AlertCircle,
      iconClass: "text-danger-600 bg-danger-50 border-danger-200",
      buttonVariant: "danger" as const,
    },
    warning: {
      icon: AlertTriangle,
      iconClass: "text-warning-600 bg-warning-50 border-warning-200",
      buttonVariant: "primary" as const,
    },
    info: {
      icon: Info,
      iconClass: "text-primary-600 bg-primary-50 border-primary-200",
      buttonVariant: "primary" as const,
    },
    success: {
      icon: CheckCircle2,
      iconClass: "text-success-600 bg-success-50 border-success-200",
      buttonVariant: "success" as const,
    },
  };

  const { icon: Icon, iconClass, buttonVariant } = iconConfig[variant];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="sm"
      showCloseButton={!isLoading}
      footer={
        <>
          <Button
            variant="outline"
            size="md"
            onClick={onClose}
            disabled={isLoading}
          >
            {cancelText}
          </Button>
          <Button
            variant={buttonVariant}
            size="md"
            onClick={onConfirm}
            isLoading={isLoading}
          >
            {confirmText}
          </Button>
        </>
      }
    >
      <div className="flex items-start gap-4">
        <div
          className={`p-3 rounded-xl border shrink-0 ${iconClass}`}
        >
          <Icon className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <h4 className="text-base font-bold text-dark-900">{title}</h4>
          <p className="text-xs text-dark-500 leading-relaxed">
            {description}
          </p>
        </div>
      </div>
    </Modal>
  );
};

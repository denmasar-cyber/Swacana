// ─── Design System — Component Library ───────────────────────────────────
// Inspired by Reflect UI's component architecture
// Theme: Vintage Claymorphism for Swacana

export { default as Button } from './Button';
export type { ButtonProps } from './Button';

export { default as Input } from './Input';
export type { InputProps } from './Input';

export { default as Select } from './Select';
export type { SelectProps } from './Select';

export { default as Toggle } from './Toggle';
export type { ToggleProps } from './Toggle';

export { default as Card, CardHeader, CardBody, CardFooter } from './Card';
export type { CardProps } from './Card';

export { default as Modal } from './Modal';
export type { ModalProps } from './Modal';

export { default as Dialog, useDialog } from './Dialog';
export type { DialogProps } from './Dialog';

export { default as Avatar } from './Avatar';
export type { AvatarProps } from './Avatar';

export { default as Badge } from './Badge';
export type { BadgeProps } from './Badge';

export { default as Tooltip } from './Tooltip';
export type { TooltipProps } from './Tooltip';

export { default as Tabs } from './Tabs';
export type { TabsProps, Tab } from './Tabs';

export { default as Dropdown } from './Dropdown';
export type { DropdownProps, DropdownOption } from './Dropdown';

export { default as Skeleton, SkeletonGroup } from './Skeleton';
export type { SkeletonProps } from './Skeleton';

export { default as ProgressBar } from './ProgressBar';
export type { ProgressBarProps } from './ProgressBar';

export { ToastProvider, useToast } from './Toast';

// Canvas Editor (Phase 2)
export { default as Canvas } from './Canvas';
export type { CanvasProps } from './Canvas';

// Design-to-Code Engine (Phase 3)
export { default as CodeGen } from './CodeGen';
export type { CodeGenProps } from './CodeGen';

// Motion/Animation System (Phase 4)
export { AnimateIn, HoverLift, PressScale, TiltCard, StaggerGroup, Float, GlowPulse } from './Motion';
export type { AnimateInProps, HoverLiftProps, PressScaleProps, TiltCardProps, StaggerGroupProps, FloatProps, GlowPulseProps } from './Motion';

// Database/CMS Builder (Phase 5)
export { default as FormBuilder } from './FormBuilder';
export type { FormBuilderProps, FormSchema, FormField, FieldType } from './FormBuilder';

export { default as DataTable } from './DataTable';
export type { DataTableProps, Column } from './DataTable';

export { default as CMSDashboard } from './CMSDashboard';
export type { CMSDashboardProps } from './CMSDashboard';

// Note Integration (Phase 6)
export { default as NoteStudio } from './NoteStudio';
export type { NoteStudioProps } from './NoteStudio';

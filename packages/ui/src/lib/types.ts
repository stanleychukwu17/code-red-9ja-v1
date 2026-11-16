import { ComponentType, SVGProps } from "react";

// Sidebar navigation item
export type SidebarItem = {
  title: string;
  url: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  count?: number;
};

// Form drawer/modal props
export type FormProps<T = unknown> = {
  setOpen?: (open: boolean) => void;
  initialData?: T;
  id?: string;
  mode?: FormMode;
  update?: (item: T) => void;
  remove?: () => void;
};

// Form action states and dialog behaviors
export type FormMode = "create" | "update" | "delete" | "manage" | "review";
export type DialogMode = "closable" | "not-closable";

// Option item selector props
export type BulletProps<T, TID = string | number> = {
  initialData?: T;
  buttonText?: string;
  update: (item: T) => void;
  errorMsg?: string;
  hideIcon?: boolean;
  disabled?: boolean;
  selectedId?: TID;
  numberOfItems?: number;
  readOnly?: boolean;
  align?: "start" | "center" | "end";
  showAll?: boolean | string;
  showNone?: boolean;
};

// Select component props extending selector base
export type SelectProps<T, TID = string> = {
  className?: string;
  size?: "select" | "sm" | "xs" | "default";
} & BulletProps<T, TID>;

// Context dropdown action props
export type DropdownProp<T> = {
  id: T;
  handleDownload?: () => void;
};

// Modal dialog display props
export type DialogProps = {
  setOpen: (v: boolean) => void;
  hideClose?: boolean;
  dialogMode?: DialogMode;
  id?: string;
};

// Notification entity targets and event categories
export type NotificationEntityType =
  | "post"
  | "course"
  | "comment"
  | "user"
  | "assignment"
  | "event"
  | "system"
  | "announcement";
export type NotificationType =
  | "like"
  | "comment"
  | "share"
  | "mention"
  | "follow"
  | "reply"
  | "system";

// Dropdown menu item and group definitions
export type TDropdownItem<T = unknown | string> = {
  title: string;
  shortcut?: string;
  imgUrl?: string;
  icon?: React.ReactNode;
  action?: (id?: T) => void;
  className?: string;
  disabled?: boolean;
  hidden?: boolean;
};

export type TDropdownGroup = TDropdownItem[];

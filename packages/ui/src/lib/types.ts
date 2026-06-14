import { ComponentType, SVGProps } from "react";

export type SidebarItem = {
  title: string;
  url: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  count?: number;
};

export type FormProps<T = unknown> = {
  setOpen?: (open: boolean) => void;
  initialData?: T;
  id?: string;
  mode?: FormMode;
  update?: (item: T) => void;
  remove?: () => void;
};

export type FormMode = "create" | "update" | "delete" | "manage" | "review";
export type DialogMode = "closable" | "not-closable";

export type BulletProps<T, TID = string> = {
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
};

export type SelectProps<T, TID = string> = {
  className?: string;
} & BulletProps<T, TID>;

export type DropdownProp<T> = {
  id: T;
  handleDownload?: () => void;
};

export type DialogProps = {
  setOpen: (v: boolean) => void;
  hideClose?: boolean;
  dialogMode?: DialogMode;
  id?: string;
};

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

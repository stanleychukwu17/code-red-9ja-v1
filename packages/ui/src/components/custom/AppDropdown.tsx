import { TDropdownGroup, TDropdownItem } from "../../lib/types";
import { cn } from "../../lib/utils";
import {
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
} from "../dropdown-menu";

const DropdownGroupList = ({ groups }: { groups: TDropdownGroup[] }) => {
  return (
    <>
      {groups.map((group, index) => (
        <DropdownMenuGroup key={index}>
          <DropdownMenuList menu={group} />
          {groups.length - 1 > index && <DropdownMenuSeparator />}
        </DropdownMenuGroup>
      ))}
    </>
  );
};

const DropdownMenuList = ({ menu }: { menu: TDropdownItem[] }) => {
  return (
    <>
      {menu
        .filter((item) => !item.hidden)
        .map((item) => (
          <DropdownMenuItem
            key={item.title}
            onMouseDown={item.action}
            className={cn(item?.className)}
            disabled={item.disabled}
          >
            {item.icon}
            {item.title}
            <DropdownMenuShortcut>{item.shortcut}</DropdownMenuShortcut>
          </DropdownMenuItem>
        ))}
    </>
  );
};

export { DropdownGroupList, DropdownMenuList };

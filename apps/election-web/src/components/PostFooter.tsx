import { Plus, Image as ImageIcon } from "lucide-react";
import { Button } from "@repo/ui/components/button";
import { StickyFooter } from "#/components/Footers";
import {
  Drawer,
  DrawerContent,
  DrawerTrigger,
  DrawerTitle,
  DrawerHeader,
} from "@repo/ui/components/drawer";

interface ReportCategory {
  title: string;
  tags: string[];
}

interface PostFooterProps {
  isDrawerOpen: boolean;
  setIsDrawerOpen: (open: boolean) => void;
  categories: ReportCategory[];
  selectedTags: string[];
  toggleTag: (tag: string) => void;
  onGalleryClick: () => void;
  onCameraImageClick: () => void;
  onCameraVideoClick: () => void;
  isInputMode?: boolean;
  onSkip?: () => void;
}

export function PostFooter({
  isDrawerOpen,
  setIsDrawerOpen,
  categories,
  selectedTags,
  toggleTag,
  onGalleryClick,
  onCameraImageClick,
  onCameraVideoClick,
  isInputMode = true,
  onSkip,
}: PostFooterProps) {
  return (
    <StickyFooter>
      <div className="flex flex-wrap items-center gap-3">
        <Drawer open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
          <DrawerTrigger asChild>
            <Button variant="outline" className="rounded-[12px] gap-2">
              <Plus className="w-[18px] h-[18px]" strokeWidth={2.5} /> Report
              Type
            </Button>
          </DrawerTrigger>
          <DrawerContent className="px-5 pb-8 max-h-[85vh]">
            <DrawerHeader className="px-0 pt-6 pb-2 text-center">
              <DrawerTitle className="text-[18px] font-extrabold text-neutral-900">
                Select report types
              </DrawerTitle>
            </DrawerHeader>

            <div className="flex flex-col gap-6 overflow-y-auto mt-4 px-1 pb-4">
              {categories.map((category) => (
                <div key={category.title} className="flex flex-col gap-3">
                  <span className="text-neutral-500 font-extrabold text-[13px] uppercase tracking-wide">
                    {category.title}
                  </span>
                  <div className="flex flex-col gap-2">
                    {category.tags.map((tag) => (
                      <button
                        key={tag}
                        onClick={() => toggleTag(tag)}
                        className={`text-left p-4 rounded-[12px] font-medium text-[16px] transition ${
                          selectedTags.includes(tag)
                            ? "bg-[#E6FBF2] text-[#0F4C3A] border border-[#00DF82]/30"
                            : "bg-[#F5F5F5] text-neutral-800 border border-transparent hover:bg-neutral-200"
                        }`}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <Button
              variant="default"
              size="4xl"
              onClick={() => setIsDrawerOpen(false)}
              className="w-full mt-4"
            >
              Continue
            </Button>
          </DrawerContent>
        </Drawer>

        <Button
          variant="outline"
          className="rounded-[12px] gap-2"
          onClick={onGalleryClick}
        >
          <ImageIcon className="w-[18px] h-[18px]" strokeWidth={2.5} />{" "}
          Gallery
        </Button>
      </div>

      <div className="flex items-center gap-3 w-full">
        <Button
          variant="deepGrey"
          size="4xl"
          className="flex-1"
          onClick={onCameraImageClick}
        >
          Take Picture
        </Button>
        <Button
          variant="deepGrey"
          size="4xl"
          className="flex-1"
          onClick={onCameraVideoClick}
        >
          Take Video
        </Button>
      </div>

      {!isInputMode && onSkip && (
        <Button
          variant="outline"
          size="4xl"
          className="w-full mt-1"
          onClick={onSkip}
        >
          Skip
        </Button>
      )}
    </StickyFooter>
  );
}

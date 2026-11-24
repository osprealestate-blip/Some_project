import PageSkeleton from "@/components/PageSkeleton";

/** Shown while any page without its own loading screen streams in (the layout and header are already on screen). */
export default function Loading() {
  return <PageSkeleton label="Loading" />;
}

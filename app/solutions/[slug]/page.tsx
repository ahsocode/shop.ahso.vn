import Page, { generateMetadata as _generateMetadata } from "@/app/shop/solutions/[slug]/page";

// Re-export component and metadata; set config literals here (no re-export)
export const revalidate = 60;
export const generateMetadata = _generateMetadata;
export default Page;

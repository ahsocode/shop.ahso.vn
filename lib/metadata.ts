import type { Metadata } from "next";

const FALLBACK_SITE_URL = "https://ahso.vn";

export const SITE_NAME = "AHSO Industrial";
export const SITE_TAGLINE = "Giải pháp và phần mềm công nghiệp";
export const SITE_DESCRIPTION =
  "AHSO Industrial giới thiệu giải pháp, phần mềm và năng lực triển khai trong lĩnh vực công nghiệp cho doanh nghiệp Việt Nam.";
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? FALLBACK_SITE_URL;

const DEFAULT_OG_IMAGE = "/logo.png";

type BuildMetadataArgs = {
  title: string;
  description?: string;
  keywords?: string | string[];
  path?: string;
  image?: string;
  robots?: Metadata["robots"];
};

const absoluteUrl = (value?: string) => {
  if (!value) return undefined;
  try {
    return value.startsWith("http") ? value : new URL(value, SITE_URL).toString();
  } catch {
    return value;
  }
};

export function buildMetadata({
  title,
  description = SITE_DESCRIPTION,
  keywords,
  path,
  image = DEFAULT_OG_IMAGE,
  robots,
}: BuildMetadataArgs): Metadata {
  const canonical = path ? absoluteUrl(path) : undefined;
  const keywordsString = Array.isArray(keywords) ? keywords.join(", ") : keywords;
  const ogImage = absoluteUrl(image) ?? absoluteUrl(DEFAULT_OG_IMAGE);

  return {
    title,
    description,
    keywords: keywordsString,
    alternates: canonical ? { canonical } : undefined,
    openGraph: {
      title,
      description,
      url: canonical ?? SITE_URL,
      siteName: SITE_NAME,
      locale: "vi_VN",
      type: "website",
      images: ogImage ? [{ url: ogImage }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ogImage ? [ogImage] : undefined,
    },
    robots,
  };
}

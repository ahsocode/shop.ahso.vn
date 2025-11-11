import Page from "@/app/software/page";
import type { Metadata } from "next";

export const revalidate = 60;

export const generateMetadata = async (): Promise<Metadata> => {
  return {
	title: "Software",
  };
};

export default Page;

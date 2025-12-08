declare module "*.css";

declare module "next/image" {
  export { default } from "next/dist/shared/lib/image-external";
  export * from "next/dist/shared/lib/image-external";
}

declare module "next/link" {
  export { default } from "next/dist/client/link";
  export * from "next/dist/client/link";
}

// app/(workspace)/page.tsx
import type { Metadata } from "next";
import { HomeClient } from "./home-client";

export const metadata: Metadata = {
  title: "Kreativ Forms",
};

export default function Page() {
  return <HomeClient />;
}
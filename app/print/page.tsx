import type { Metadata } from "next";
import { PrintDeck } from "@/components/print-deck";

export const metadata: Metadata = {
  title: "Global Superstore slides",
};

export default function PrintPage() {
  return <PrintDeck />;
}

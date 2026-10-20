import DocPage from "@/components/DocPage";
import { getHome } from "@/lib/content";
import { docMetadata } from "@/lib/meta";

export function generateMetadata() {
  return docMetadata(getHome(), { home: true });
}

export default function Home() {
  return <DocPage doc={getHome()} home />;
}

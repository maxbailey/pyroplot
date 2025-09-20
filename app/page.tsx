import { MapShell } from "./components/map-shell";
import { AppProvider } from "@/lib/contexts";

export default async function Home() {
  return (
    <AppProvider>
      <MapShell />
    </AppProvider>
  );
}

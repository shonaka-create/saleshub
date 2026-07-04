import { TeamTabs } from "./tabs";

export default function TeamLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <TeamTabs />
      {children}
    </div>
  );
}

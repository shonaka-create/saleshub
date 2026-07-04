import { RevenueTabs } from "./tabs";

export default function RevenueLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <RevenueTabs />
      {children}
    </div>
  );
}

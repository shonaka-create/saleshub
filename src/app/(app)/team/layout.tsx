import { TeamBackLink } from "./team-back-link";

export default function TeamLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <TeamBackLink />
      {children}
    </div>
  );
}

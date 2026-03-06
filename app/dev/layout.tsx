import { notFound } from "next/navigation";

export default function DevLayout({ children }: { children: React.ReactNode }) {
  if (process.env.ENV_NAME !== "development") {
    notFound();
  }
  return <>{children}</>;
}

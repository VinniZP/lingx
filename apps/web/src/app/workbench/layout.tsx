export default function WorkbenchLayout({ children }: { children: React.ReactNode }) {
  return <div className="bg-background h-screen w-screen overflow-hidden">{children}</div>;
}

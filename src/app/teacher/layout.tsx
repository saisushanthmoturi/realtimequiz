"use client";

import TeacherNavigation from "@/components/TeacherNavigation";

export default function TeacherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <TeacherNavigation />
      {children}
    </>
  );
}

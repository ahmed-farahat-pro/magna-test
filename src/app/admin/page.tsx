import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/admin";
import AdminDashboard from "@/components/AdminDashboard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  if (!(await isAdmin())) redirect("/admin/login");
  return <AdminDashboard />;
}

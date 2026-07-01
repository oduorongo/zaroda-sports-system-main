import { PanelErrorBoundary } from "@/components/error-boundary";
import { TenantsGrid } from "@/components/admin/tenants-grid";

export default function AdminTenantsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Tenants</h1>
        <p className="text-muted">All schools and open-tournament organizers on the platform.</p>
      </div>
      <PanelErrorBoundary fallbackTitle="Tenants failed to load">
        <TenantsGrid />
      </PanelErrorBoundary>
    </div>
  );
}

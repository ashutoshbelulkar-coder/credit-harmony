import { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  defaultRemediationSettings,
  type RemediationSetting,
  type RemediationDomain,
} from "@/data/alert-engine-mock";

const cardClass =
  "bg-card rounded-xl border border-border p-6 shadow-[0_1px_3px_rgba(15,23,42,0.06)]";

export function AutoRemediationSettings() {
  const [settings, setSettings] = useState<RemediationSetting[]>(defaultRemediationSettings);

  const toggle = (domain: RemediationDomain, actionIndex: number) => {
    setSettings((prev) =>
      prev.map((s) =>
        s.domain === domain
          ? {
              ...s,
              actions: s.actions.map((a, i) =>
                i === actionIndex ? { ...a, enabled: !a.enabled } : a
              ),
            }
          : s
      )
    );
  };

  return (
    <section>
      <h3 className="text-h4 font-semibold text-foreground mb-2">Auto Remediation Settings</h3>
      <p className="text-caption text-muted-foreground mb-4">Optional: configure automatic actions when a breach occurs, per domain.</p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {settings.map((group) => (
          <div key={group.domain} className={cardClass}>
            <h4 className="text-body font-semibold text-foreground mb-4">{group.domain}</h4>
            <div className="space-y-4">
              {group.actions.map((item, idx) => (
                <div key={item.action} className="flex items-center justify-between gap-4">
                  <Label htmlFor={`${group.domain}-${item.action}`} className="text-body cursor-pointer flex-1">
                    {item.action}
                  </Label>
                  <Switch
                    id={`${group.domain}-${item.action}`}
                    checked={item.enabled}
                    onCheckedChange={() => toggle(group.domain, idx)}
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

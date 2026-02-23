"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Palette, Sun, Moon, Monitor, Maximize2, Minimize2, PanelLeftOpen, PanelLeftClose } from "lucide-react";

type ThemeOption = "light" | "dark" | "system";
type DensityOption = "comfortable" | "compact";
type SidebarOption = "expanded" | "collapsed";

export function AppearanceTab() {
  const [theme, setTheme] = useState<ThemeOption>("light");
  const [density, setDensity] = useState<DensityOption>("comfortable");
  const [sidebar, setSidebar] = useState<SidebarOption>("expanded");

  const themeOptions: { value: ThemeOption; label: string; icon: React.ElementType; description: string }[] = [
    { value: "light", label: "Light", icon: Sun, description: "Default light theme" },
    { value: "dark", label: "Dark", icon: Moon, description: "Easy on the eyes" },
    { value: "system", label: "System", icon: Monitor, description: "Follow OS setting" },
  ];

  const densityOptions: { value: DensityOption; label: string; icon: React.ElementType; description: string }[] = [
    { value: "comfortable", label: "Comfortable", icon: Maximize2, description: "More spacing between elements" },
    { value: "compact", label: "Compact", icon: Minimize2, description: "Fit more content on screen" },
  ];

  const sidebarOptions: { value: SidebarOption; label: string; icon: React.ElementType; description: string }[] = [
    { value: "expanded", label: "Expanded", icon: PanelLeftOpen, description: "Show full sidebar with labels" },
    { value: "collapsed", label: "Collapsed", icon: PanelLeftClose, description: "Show icons only by default" },
  ];

  return (
    <Card className="border border-gray-200">
      <CardContent className="p-6">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Palette className="h-5 w-5 text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-900">
              Appearance
            </h2>
          </div>
          <Badge className="border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-50">
            Coming Soon
          </Badge>
        </div>
        <p className="mb-6 text-sm text-gray-500">
          Customize the look and feel of your CRM dashboard.
        </p>

        {/* Theme Selection */}
        <div className="mb-8">
          <h3 className="mb-3 text-sm font-medium text-gray-900">Theme</h3>
          <div className="grid grid-cols-3 gap-3">
            {themeOptions.map((option) => {
              const Icon = option.icon;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setTheme(option.value)}
                  className={`flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-colors ${
                    theme === option.value
                      ? "border-[#dc2626] bg-red-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <Icon
                    className={`h-6 w-6 ${
                      theme === option.value ? "text-[#dc2626]" : "text-gray-500"
                    }`}
                  />
                  <span
                    className={`text-sm font-medium ${
                      theme === option.value ? "text-[#dc2626]" : "text-gray-700"
                    }`}
                  >
                    {option.label}
                  </span>
                  <span className="text-xs text-gray-500">{option.description}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Density Selection */}
        <div className="mb-8">
          <h3 className="mb-3 text-sm font-medium text-gray-900">Density</h3>
          <div className="grid grid-cols-2 gap-3">
            {densityOptions.map((option) => {
              const Icon = option.icon;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setDensity(option.value)}
                  className={`flex items-center gap-3 rounded-lg border-2 p-4 transition-colors ${
                    density === option.value
                      ? "border-[#dc2626] bg-red-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <Icon
                    className={`h-5 w-5 ${
                      density === option.value ? "text-[#dc2626]" : "text-gray-500"
                    }`}
                  />
                  <div className="text-left">
                    <p
                      className={`text-sm font-medium ${
                        density === option.value ? "text-[#dc2626]" : "text-gray-700"
                      }`}
                    >
                      {option.label}
                    </p>
                    <p className="text-xs text-gray-500">{option.description}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Sidebar Default */}
        <div>
          <h3 className="mb-3 text-sm font-medium text-gray-900">
            Sidebar Default
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {sidebarOptions.map((option) => {
              const Icon = option.icon;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setSidebar(option.value)}
                  className={`flex items-center gap-3 rounded-lg border-2 p-4 transition-colors ${
                    sidebar === option.value
                      ? "border-[#dc2626] bg-red-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <Icon
                    className={`h-5 w-5 ${
                      sidebar === option.value ? "text-[#dc2626]" : "text-gray-500"
                    }`}
                  />
                  <div className="text-left">
                    <p
                      className={`text-sm font-medium ${
                        sidebar === option.value ? "text-[#dc2626]" : "text-gray-700"
                      }`}
                    >
                      {option.label}
                    </p>
                    <p className="text-xs text-gray-500">{option.description}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

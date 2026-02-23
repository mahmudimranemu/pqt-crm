"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Globe, Languages, Clock, Calendar, DollarSign } from "lucide-react";

interface PreferenceOption {
  value: string;
  label: string;
}

export function PreferencesTab() {
  const [language, setLanguage] = useState("en");
  const [timezone, setTimezone] = useState("Europe/Istanbul");
  const [dateFormat, setDateFormat] = useState("DD/MM/YYYY");
  const [currency, setCurrency] = useState("USD");

  const languages: PreferenceOption[] = [
    { value: "en", label: "English" },
    { value: "tr", label: "Turkish" },
    { value: "ar", label: "Arabic" },
    { value: "fr", label: "French" },
  ];

  const timezones: PreferenceOption[] = [
    { value: "Europe/Istanbul", label: "UTC+3 Istanbul" },
    { value: "Europe/London", label: "UTC+0 London" },
    { value: "America/New_York", label: "UTC-5 New York" },
    { value: "Asia/Dubai", label: "UTC+4 Dubai" },
    { value: "Asia/Riyadh", label: "UTC+3 Riyadh" },
  ];

  const dateFormats: PreferenceOption[] = [
    { value: "DD/MM/YYYY", label: "DD/MM/YYYY" },
    { value: "MM/DD/YYYY", label: "MM/DD/YYYY" },
    { value: "YYYY-MM-DD", label: "YYYY-MM-DD" },
  ];

  const currencies: PreferenceOption[] = [
    { value: "USD", label: "USD ($)" },
    { value: "EUR", label: "EUR (E)" },
    { value: "GBP", label: "GBP (P)" },
    { value: "TRY", label: "TRY (L)" },
    { value: "AED", label: "AED (Dhs)" },
  ];

  const preferenceGroups = [
    {
      id: "language",
      label: "Language",
      icon: Languages,
      description: "Select your preferred display language.",
      value: language,
      setter: setLanguage,
      options: languages,
    },
    {
      id: "timezone",
      label: "Timezone",
      icon: Clock,
      description: "Set your local timezone for dates and times.",
      value: timezone,
      setter: setTimezone,
      options: timezones,
    },
    {
      id: "dateFormat",
      label: "Date Format",
      icon: Calendar,
      description: "Choose how dates are displayed throughout the CRM.",
      value: dateFormat,
      setter: setDateFormat,
      options: dateFormats,
    },
    {
      id: "currency",
      label: "Default Currency",
      icon: DollarSign,
      description: "Set the default currency for deals and payments.",
      value: currency,
      setter: setCurrency,
      options: currencies,
    },
  ];

  return (
    <Card className="border border-gray-200">
      <CardContent className="p-6">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Globe className="h-5 w-5 text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-900">Preferences</h2>
          </div>
          <Badge className="border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-50">
            Coming Soon
          </Badge>
        </div>
        <p className="mb-6 text-sm text-gray-500">
          Customize regional and display preferences for your account.
        </p>

        <div className="space-y-6">
          {preferenceGroups.map((group) => {
            const Icon = group.icon;
            return (
              <div key={group.id} className="space-y-2">
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4 text-gray-500" />
                  <Label htmlFor={group.id} className="text-sm font-medium text-gray-900">
                    {group.label}
                  </Label>
                </div>
                <p className="text-sm text-gray-500">{group.description}</p>
                <select
                  id={group.id}
                  value={group.value}
                  onChange={(e) => group.setter(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 focus:border-[#dc2626] focus:outline-none focus:ring-1 focus:ring-[#dc2626]"
                >
                  {group.options.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

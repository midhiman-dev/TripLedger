export type DefaultCategoryDefinition = {
  name: string;
  icon: string;
  color: string;
};

export const defaultCategoryDefinitions: DefaultCategoryDefinition[] = [
  { name: "Fuel", icon: "local_gas_station", color: "#865300" },
  { name: "Food", icon: "restaurant", color: "#36b96a" },
  { name: "Stay", icon: "hotel", color: "#1a1c54" },
  { name: "Tolls", icon: "toll", color: "#694000" },
  { name: "Parking", icon: "local_parking", color: "#565993" },
  { name: "Misc", icon: "category", color: "#777680" },
];

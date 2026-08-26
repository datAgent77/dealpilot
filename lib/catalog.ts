// Deterministic seed catalog for the DealPilot spike.
// Full build will generate ~100-150 vehicles; the spike uses a small honest set.

export type Vehicle = {
  id: string;
  make: string;
  model: string;
  year: number;
  price: number;
  fairValue: number; // deterministic estimate (own logic, not Ederi)
  miles: number;
  titleClean: boolean;
  location: string;
};

export const VEHICLES: Vehicle[] = [
  { id: "v1", make: "Tesla", model: "Model 3", year: 2021, price: 19800, fairValue: 23000, miles: 41000, titleClean: true,  location: "San Jose, CA" },
  { id: "v2", make: "Tesla", model: "Model 3", year: 2020, price: 20900, fairValue: 22900, miles: 52000, titleClean: true,  location: "Oakland, CA" },
  { id: "v3", make: "Tesla", model: "Model 3", year: 2022, price: 24500, fairValue: 26200, miles: 33000, titleClean: true,  location: "Fremont, CA" },
  { id: "v4", make: "Tesla", model: "Model 3", year: 2019, price: 17200, fairValue: 18000, miles: 88000, titleClean: false, location: "Hayward, CA" },
  { id: "v5", make: "Tesla", model: "Model Y", year: 2021, price: 27900, fairValue: 30500, miles: 46000, titleClean: true,  location: "San Mateo, CA" },
  { id: "v6", make: "Toyota", model: "Camry",  year: 2020, price: 18900, fairValue: 20000, miles: 39000, titleClean: true,  location: "Santa Clara, CA" },
  { id: "v7", make: "Honda", model: "Civic",   year: 2021, price: 19500, fairValue: 20200, miles: 28000, titleClean: true,  location: "Sunnyvale, CA" },
  { id: "v8", make: "Ford",  model: "Mustang", year: 2019, price: 22500, fairValue: 21800, miles: 44000, titleClean: true,  location: "Palo Alto, CA" },
];

export type SearchArgs = {
  make?: string;
  model?: string;
  maxPrice?: number;
  maxMiles?: number;
  excludeSalvage?: boolean;
};

export function searchVehicles(args: SearchArgs): Vehicle[] {
  const make = args.make?.toLowerCase().trim();
  const model = args.model?.toLowerCase().trim();
  return VEHICLES.filter((v) => {
    if (make && !v.make.toLowerCase().includes(make)) return false;
    if (model && !v.model.toLowerCase().includes(model)) return false;
    if (args.maxPrice != null && v.price > args.maxPrice) return false;
    if (args.maxMiles != null && v.miles > args.maxMiles) return false;
    if (args.excludeSalvage && !v.titleClean) return false;
    return true;
  });
}

// % below (positive) or above (negative) fair value — the deal signal.
export function valueDelta(v: Vehicle): number {
  return Math.round(((v.fairValue - v.price) / v.fairValue) * 100);
}

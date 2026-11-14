export interface ListingData {
  id: string;
  address: string;
  unit?: string;
  neighbourhood: string;
  city: string;
  price: number;
  unitType: string;
  bedrooms: number;
  bathrooms: number;
  sqft: number;
  yearBuilt: number;
  rentControlled: boolean;
  moveIn: string;
  leaseTerm: string;
  image: string;
  photos: string[];
  floorPlan: string;
  postedDays: number;
  landlord: string;
  addOns: Array<{ label: string; price: number | "included" }>;
  scores: {
    price: number;
    location: number;
    transit: number;
    walkability: number;
    amenities: number;
    space: number;
  };
}

export const INITIAL_LISTINGS: ListingData[] = [
  {
    id: "1",
    address: "592 Sherbourne St",
    unit: "Unit 1204",
    neighbourhood: "St. James Town",
    city: "Toronto",
    price: 2150,
    unitType: "1br",
    bedrooms: 1,
    bathrooms: 1,
    sqft: 618,
    yearBuilt: 2019,
    rentControlled: false,
    moveIn: "Aug 1, 2025",
    leaseTerm: "12 months",
    postedDays: 2,
    landlord: "Greenfield Properties",
    image: "https://images.unsplash.com/photo-1762758731316-419c3c283ed9?w=800&h=600&fit=crop&auto=format",
    photos: ["https://images.unsplash.com/photo-1762758731316-419c3c283ed9?w=900&h=600&fit=crop&auto=format"],
    floorPlan: "https://images.unsplash.com/photo-1721244654392-9c912a6eb236?w=900&h=600&fit=crop&auto=format",
    addOns: [{ label: "Parking", price: 165 }, { label: "Storage locker", price: 65 }, { label: "Air conditioning", price: "included" }],
    scores: { price: 8.9, location: 7.8, transit: 9.1, walkability: 8.4, amenities: 8.0, space: 6.5 },
  },
  {
    id: "2",
    address: "480 King St W",
    unit: "Loft 612",
    neighbourhood: "King West",
    city: "Toronto",
    price: 2850,
    unitType: "1br+den",
    bedrooms: 1,
    bathrooms: 1,
    sqft: 780,
    yearBuilt: 2004,
    rentControlled: true,
    moveIn: "Jul 15, 2025",
    leaseTerm: "12 months",
    postedDays: 5,
    landlord: "West End Living",
    image: "https://images.unsplash.com/photo-1774234528950-a2ba88c3c1b2?w=800&h=600&fit=crop&auto=format",
    photos: ["https://images.unsplash.com/photo-1774234528950-a2ba88c3c1b2?w=900&h=600&fit=crop&auto=format"],
    floorPlan: "https://images.unsplash.com/photo-1721244654392-9c912a6eb236?w=900&h=600&fit=crop&auto=format",
    addOns: [{ label: "Parking", price: 195 }, { label: "Gym access", price: "included" }],
    scores: { price: 5.8, location: 9.2, transit: 9.4, walkability: 9.5, amenities: 7.5, space: 7.8 },
  },
];

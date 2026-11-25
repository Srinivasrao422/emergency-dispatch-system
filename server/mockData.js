// Clean Seed Data for Emergency Home Services Auto-Dispatch System

export const INITIAL_USERS = [
  {
    id: 'u_cust_1',
    name: 'Jane Doe',
    email: 'customer@resqdispatch.com',
    password: 'cust123',
    role: 'customer',
    phone: '+1 (555) 234-5678',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
    address: '452 Broadway, SoHo, New York, NY 10013',
    savedAddresses: [
      { id: 'addr_1', label: 'Home (SoHo)', address: '452 Broadway, SoHo, New York, NY 10013', lat: 40.7208, lng: -74.0007 },
      { id: 'addr_2', label: 'Office (Midtown)', address: '350 5th Ave, Midtown, NY 10118', lat: 40.7484, lng: -73.9857 },
      { id: 'addr_3', label: 'Weekend Loft (Chelsea)', address: '120 W 23rd St, Chelsea, NY 10011', lat: 40.7431, lng: -73.9938 }
    ],
    coordinates: { lat: 40.7208, lng: -74.0007 }
  },
  {
    id: 'u_tech_1',
    name: 'Mike Ross',
    email: 'tech@resqdispatch.com',
    password: 'tech123',
    role: 'technician',
    phone: '+1 (555) 101-2001',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
    category: 'plumbing',
    categoryName: 'Master Plumber',
    rating: 4.9,
    reviewCount: 42,
    isOnline: true,
    status: 'idle',
    currentLocation: {
      lat: 40.7265,
      lng: -73.9982,
      address: 'Washington Square, New York, NY'
    },
    workingRadiusKm: 15,
    completedJobsToday: 0,
    walletBalance: 380.0,
    earningsToday: 0.0,
    activeRequestId: null,
    vehicle: { type: 'Emergency Response Van', plate: 'RES-7721' }
  },
  {
    id: 'u_admin_1',
    name: 'Sarah Connor',
    email: 'admin@resqdispatch.com',
    password: 'admin123',
    role: 'admin',
    phone: '+1 (555) 999-0000',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150',
    title: 'Operations & Dispatch Director'
  }
];

export const INITIAL_TECHNICIANS = [
  {
    id: 't_plumb_1',
    name: 'Mike Ross',
    email: 'tech@resqdispatch.com',
    password: 'tech123',
    role: 'technician',
    phone: '+1 (555) 101-2001',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
    category: 'plumbing',
    categoryName: 'Master Plumber',
    rating: 4.9,
    reviewCount: 42,
    isOnline: true,
    status: 'idle',
    currentLocation: {
      lat: 40.7265,
      lng: -73.9982,
      address: 'Washington Square, New York, NY'
    },
    workingRadiusKm: 15,
    completedJobsToday: 0,
    walletBalance: 380.0,
    earningsToday: 0.0,
    activeRequestId: null,
    vehicle: { type: 'Emergency Response Van', plate: 'RES-7721' }
  },
  {
    id: 't_elec_1',
    name: 'Dave Miller',
    email: 'dave.miller@resqdispatch.com',
    password: 'tech123',
    role: 'technician',
    phone: '+1 (555) 101-2002',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
    category: 'electrical',
    categoryName: 'Licensed Electrician',
    rating: 4.85,
    reviewCount: 38,
    isOnline: true,
    status: 'idle',
    currentLocation: {
      lat: 40.7350,
      lng: -73.9910,
      address: 'Gramercy District, New York, NY'
    },
    workingRadiusKm: 15,
    completedJobsToday: 0,
    walletBalance: 380.0,
    earningsToday: 0.0,
    activeRequestId: null,
    vehicle: { type: 'Rapid Utility Motorcycle', plate: 'VOLT-90' }
  },
  {
    id: 't_hvac_1',
    name: 'Elena Rostova',
    email: 'elena.rostova@resqdispatch.com',
    password: 'tech123',
    role: 'technician',
    phone: '+1 (555) 101-2003',
    avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150',
    category: 'hvac',
    categoryName: 'HVAC Specialist',
    rating: 4.95,
    reviewCount: 29,
    isOnline: true,
    status: 'idle',
    currentLocation: {
      lat: 40.7484,
      lng: -73.9857,
      address: 'Midtown South, New York, NY'
    },
    workingRadiusKm: 20,
    completedJobsToday: 0,
    activeRequestId: null,
    vehicle: { type: 'Climate Service Truck', plate: 'COOL-44' }
  },
  {
    id: 't_appl_1',
    name: 'David Kim',
    email: 'david.kim@resqdispatch.com',
    password: 'tech123',
    role: 'technician',
    phone: '+1 (555) 101-2004',
    avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150',
    category: 'appliances',
    categoryName: 'Appliance Specialist',
    rating: 4.8,
    reviewCount: 24,
    isOnline: true,
    status: 'idle',
    currentLocation: {
      lat: 40.7100,
      lng: -74.0050,
      address: 'Financial District, New York, NY'
    },
    workingRadiusKm: 15,
    completedJobsToday: 0,
    walletBalance: 380.0,
    earningsToday: 0.0,
    activeRequestId: null,
    vehicle: { type: 'Appliance Repair Wagon', plate: 'FIX-109' }
  },
  {
    id: 't_gas_1',
    name: 'James Cooper',
    email: 'james.cooper@resqdispatch.com',
    password: 'tech123',
    role: 'technician',
    phone: '+1 (555) 101-2005',
    avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150',
    category: 'gas',
    categoryName: 'Gas Safety Specialist',
    rating: 5.0,
    reviewCount: 31,
    isOnline: true,
    status: 'idle',
    currentLocation: {
      lat: 40.7180,
      lng: -73.9880,
      address: 'Lower East Side, New York, NY'
    },
    workingRadiusKm: 25,
    completedJobsToday: 0,
    activeRequestId: null,
    vehicle: { type: 'Gas Emergency Cruiser', plate: 'HAZ-001' }
  },
  {
    id: 't_plumb_2',
    name: 'Priya Sharma',
    email: 'priya.sharma@resqdispatch.com',
    password: 'tech123',
    role: 'technician',
    phone: '+1 (555) 101-2006',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    category: 'plumbing',
    categoryName: 'Rapid Response Plumber',
    rating: 4.75,
    reviewCount: 19,
    isOnline: true,
    status: 'idle',
    currentLocation: {
      lat: 40.7505,
      lng: -73.9934,
      address: 'Chelsea / Hudson Yards, New York, NY'
    },
    workingRadiusKm: 15,
    completedJobsToday: 0,
    walletBalance: 380.0,
    earningsToday: 0.0,
    activeRequestId: null,
    vehicle: { type: 'Rapid Response Moto', plate: 'PIPE-88' }
  }
];

// Clean Initial State: ZERO dummy requests!
export const INITIAL_REQUESTS = [];

export const SERVICE_CATEGORIES = [
  {
    id: 'plumbing',
    name: 'Plumbing',
    icon: 'Droplets',
    slaTargetMin: 15,
    commonIssues: [
      'Burst Water Pipe / Flooding',
      'Clogged Main Drain Line',
      'Water Heater Leaking'
    ],
    defaultPriority: 'CRITICAL',
    description: 'Emergency response for pipe bursts, active flooding, and severe leaks.'
  },
  {
    id: 'electrical',
    name: 'Electrical',
    icon: 'Zap',
    slaTargetMin: 12,
    commonIssues: [
      'Breaker Panel Buzzing / Sparking',
      'Sudden Total Power Outage',
      'Burning Smell from Wall Outlet'
    ],
    defaultPriority: 'CRITICAL',
    description: 'Certified electricians for hazardous electrical failures and short circuits.'
  },
  {
    id: 'hvac',
    name: 'HVAC & Climate',
    icon: 'Wind',
    slaTargetMin: 20,
    commonIssues: [
      'Complete AC Failure (Heatwave)',
      'Furnace Shutdown in Freezing Weather',
      'Refrigerant Leak Hissing'
    ],
    defaultPriority: 'HIGH',
    description: 'Climate restoration for acute air conditioning and heating outages.'
  },
  {
    id: 'gas',
    name: 'Gas & Hazmat',
    icon: 'Flame',
    slaTargetMin: 8,
    commonIssues: [
      'Rotten Egg Gas Smell Indoors',
      'Carbon Monoxide Detector Alert',
      'Gas Stove Valve Rupture'
    ],
    defaultPriority: 'CRITICAL',
    description: 'Immediate priority hazmat team with electronic gas detection equipment.'
  },
  {
    id: 'appliances',
    name: 'Major Appliances',
    icon: 'Cpu',
    slaTargetMin: 25,
    commonIssues: [
      'Refrigerator Cooling Loss',
      'Washing Machine Overfill Valve Jam'
    ],
    defaultPriority: 'STANDARD',
    description: 'Rapid repair for essential kitchen and laundry appliances.'
  },
  {
    id: 'carpentry',
    name: 'Lockout & Doors',
    icon: 'ShieldAlert',
    slaTargetMin: 18,
    commonIssues: [
      'Emergency Lockout with Child Inside',
      'Damaged Exterior Security Door'
    ],
    defaultPriority: 'HIGH',
    description: 'Emergency locksmith and exterior door security service.'
  }
];

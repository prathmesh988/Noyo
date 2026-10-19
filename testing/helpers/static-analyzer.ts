import fs from 'fs';
import path from 'path';

interface DiscoveredRoute {
  routeId: string;
  path: string;
  portal: 'user' | 'vendor' | 'worker' | 'admin' | 'public';
  componentName: string;
  componentFile: string;
  guard: string;
  requiredRole: string;
  params: string[];
  needsSeededEntity: boolean;
  precondition?: string;
}

interface ComponentElementInventory {
  componentName: string;
  componentPath: string;
  buttons: string[];
  links: string[];
  inputs: string[];
  forms: string[];
  modals: string[];
  dataTestIds: string[];
  ariaLabels: string[];
  navigatesTo: string[];
  socketEventsListened: string[];
  socketEventsEmitted: string[];
  childComponents: string[];
}

const FRONTEND_SRC = path.resolve(process.cwd(), '../Frontend/src');
const ANALYSIS_DIR = path.resolve(process.cwd(), 'analysis');

export function runStaticAnalysis() {
  console.log('=====================================================================');
  console.log('PHASE 1: DETERMINISTIC STATIC ANALYSIS');
  console.log('=====================================================================\n');

  if (!fs.existsSync(ANALYSIS_DIR)) {
    fs.mkdirSync(ANALYSIS_DIR, { recursive: true });
  }

  // 1. Defined Routes Map based on our route discovery
  const routes: DiscoveredRoute[] = [
    // Public
    {
      routeId: 'PUB_LANDING',
      path: '/Home',
      portal: 'public',
      componentName: 'LandingPage',
      componentFile: 'modules/landing/pages/LandingPage.jsx',
      guard: 'None',
      requiredRole: 'public',
      params: [],
      needsSeededEntity: false
    },
    // User Routes
    {
      routeId: 'USER_WELCOME',
      path: '/user',
      portal: 'user',
      componentName: 'Welcome',
      componentFile: 'modules/user/pages/Welcome.jsx',
      guard: 'PublicRoute',
      requiredRole: 'public',
      params: [],
      needsSeededEntity: false
    },
    {
      routeId: 'USER_LOGIN',
      path: '/user/login',
      portal: 'user',
      componentName: 'Login',
      componentFile: 'modules/user/pages/login/index.jsx',
      guard: 'PublicRoute',
      requiredRole: 'public',
      params: [],
      needsSeededEntity: false
    },
    {
      routeId: 'USER_SIGNUP',
      path: '/user/signup',
      portal: 'user',
      componentName: 'Signup',
      componentFile: 'modules/user/pages/signup/index.jsx',
      guard: 'PublicRoute',
      requiredRole: 'public',
      params: [],
      needsSeededEntity: false
    },
    {
      routeId: 'USER_HOME',
      path: '/user/home',
      portal: 'user',
      componentName: 'Home',
      componentFile: 'modules/user/pages/Home.jsx',
      guard: 'ProtectedRoute',
      requiredRole: 'user',
      params: [],
      needsSeededEntity: false
    },
    {
      routeId: 'USER_CART',
      path: '/user/cart',
      portal: 'user',
      componentName: 'Cart',
      componentFile: 'modules/user/pages/PremiumCartPage.jsx',
      guard: 'ProtectedRoute',
      requiredRole: 'user',
      params: [],
      needsSeededEntity: false
    },
    {
      routeId: 'USER_CHECKOUT',
      path: '/user/checkout',
      portal: 'user',
      componentName: 'Checkout',
      componentFile: 'modules/user/pages/Checkout.jsx',
      guard: 'ProtectedRoute',
      requiredRole: 'user',
      params: [],
      needsSeededEntity: true,
      precondition: 'Requires items in cart and selected address'
    },
    {
      routeId: 'USER_MY_BOOKINGS',
      path: '/user/my-bookings',
      portal: 'user',
      componentName: 'MyBookings',
      componentFile: 'modules/user/pages/MyBookings.jsx',
      guard: 'ProtectedRoute',
      requiredRole: 'user',
      params: [],
      needsSeededEntity: false
    },
    {
      routeId: 'USER_BOOKING_DETAILS',
      path: '/user/booking/:id',
      portal: 'user',
      componentName: 'BookingDetails',
      componentFile: 'modules/user/pages/BookingDetails.jsx',
      guard: 'ProtectedRoute',
      requiredRole: 'user',
      params: ['id'],
      needsSeededEntity: true,
      precondition: 'Requires valid customer booking ID'
    },
    {
      routeId: 'USER_BOOKING_TRACK',
      path: '/user/booking/:id/track',
      portal: 'user',
      componentName: 'BookingTrack',
      componentFile: 'modules/user/pages/BookingTrack.jsx',
      guard: 'ProtectedRoute',
      requiredRole: 'user',
      params: ['id'],
      needsSeededEntity: true,
      precondition: 'Requires active in-progress booking ID'
    },
    {
      routeId: 'USER_ACCOUNT',
      path: '/user/account',
      portal: 'user',
      componentName: 'Account',
      componentFile: 'modules/user/pages/Account.jsx',
      guard: 'ProtectedRoute',
      requiredRole: 'user',
      params: [],
      needsSeededEntity: false
    },
    {
      routeId: 'USER_WALLET',
      path: '/user/wallet',
      portal: 'user',
      componentName: 'Wallet',
      componentFile: 'modules/user/pages/Wallet.jsx',
      guard: 'ProtectedRoute',
      requiredRole: 'user',
      params: [],
      needsSeededEntity: false
    },
    {
      routeId: 'USER_CATEGORY',
      path: '/user/category/:slug',
      portal: 'user',
      componentName: 'CategoryPage',
      componentFile: 'modules/user/pages/PremiumCategoryPage.jsx',
      guard: 'ProtectedRoute',
      requiredRole: 'user',
      params: ['slug'],
      needsSeededEntity: true,
      precondition: 'Requires seeded category slug'
    },

    // Vendor Routes
    {
      routeId: 'VEN_LOGIN',
      path: '/vendor/login',
      portal: 'vendor',
      componentName: 'Login',
      componentFile: 'modules/vendor/pages/login/index.jsx',
      guard: 'PublicRoute',
      requiredRole: 'public',
      params: [],
      needsSeededEntity: false
    },
    {
      routeId: 'VEN_SIGNUP',
      path: '/vendor/signup',
      portal: 'vendor',
      componentName: 'Signup',
      componentFile: 'modules/vendor/pages/signup/index.jsx',
      guard: 'PublicRoute',
      requiredRole: 'public',
      params: [],
      needsSeededEntity: false
    },
    {
      routeId: 'VEN_PENDING_APPROVAL',
      path: '/vendor/pending-approval',
      portal: 'vendor',
      componentName: 'PendingApproval',
      componentFile: 'modules/vendor/pages/PendingApproval.jsx',
      guard: 'None',
      requiredRole: 'vendor',
      params: [],
      needsSeededEntity: false
    },
    {
      routeId: 'VEN_DASHBOARD',
      path: '/vendor/dashboard',
      portal: 'vendor',
      componentName: 'Dashboard',
      componentFile: 'modules/vendor/pages/Dashboard.jsx',
      guard: 'ProtectedRoute',
      requiredRole: 'vendor',
      params: [],
      needsSeededEntity: false
    },
    {
      routeId: 'VEN_BOOKING_ALERTS',
      path: '/vendor/booking-alerts',
      portal: 'vendor',
      componentName: 'BookingAlerts',
      componentFile: 'modules/vendor/pages/BookingAlerts.jsx',
      guard: 'ProtectedRoute',
      requiredRole: 'vendor',
      params: [],
      needsSeededEntity: false
    },
    {
      routeId: 'VEN_BOOKING_DETAILS',
      path: '/vendor/booking/:id',
      portal: 'vendor',
      componentName: 'BookingDetails',
      componentFile: 'modules/vendor/pages/BookingDetails.jsx',
      guard: 'ProtectedRoute',
      requiredRole: 'vendor',
      params: ['id'],
      needsSeededEntity: true,
      precondition: 'Requires assigned or accepted booking ID'
    },
    {
      routeId: 'VEN_BILLING',
      path: '/vendor/booking/:id/billing',
      portal: 'vendor',
      componentName: 'BillingPage',
      componentFile: 'modules/vendor/pages/BillingPage.jsx',
      guard: 'ProtectedRoute',
      requiredRole: 'vendor',
      params: ['id'],
      needsSeededEntity: true,
      precondition: 'Requires in-progress booking ID'
    },
    {
      routeId: 'VEN_ASSIGN_WORKER',
      path: '/vendor/booking/:id/assign-worker',
      portal: 'vendor',
      componentName: 'AssignWorker',
      componentFile: 'modules/vendor/pages/AssignWorker.jsx',
      guard: 'ProtectedRoute',
      requiredRole: 'vendor',
      params: ['id'],
      needsSeededEntity: true,
      precondition: 'Requires accepted booking ID and registered worker'
    },
    {
      routeId: 'VEN_JOBS',
      path: '/vendor/jobs',
      portal: 'vendor',
      componentName: 'ActiveJobs',
      componentFile: 'modules/vendor/pages/ActiveJobs.jsx',
      guard: 'ProtectedRoute',
      requiredRole: 'vendor',
      params: [],
      needsSeededEntity: false
    },
    {
      routeId: 'VEN_WORKERS',
      path: '/vendor/workers',
      portal: 'vendor',
      componentName: 'WorkersList',
      componentFile: 'modules/vendor/pages/WorkersList.jsx',
      guard: 'ProtectedRoute',
      requiredRole: 'vendor',
      params: [],
      needsSeededEntity: false
    },
    {
      routeId: 'VEN_EARNINGS',
      path: '/vendor/earnings',
      portal: 'vendor',
      componentName: 'Earnings',
      componentFile: 'modules/vendor/pages/Earnings.jsx',
      guard: 'ProtectedRoute',
      requiredRole: 'vendor',
      params: [],
      needsSeededEntity: false
    },
    {
      routeId: 'VEN_WALLET',
      path: '/vendor/wallet',
      portal: 'vendor',
      componentName: 'Wallet',
      componentFile: 'modules/vendor/pages/Wallet.jsx',
      guard: 'ProtectedRoute',
      requiredRole: 'vendor',
      params: [],
      needsSeededEntity: false
    },
    {
      routeId: 'VEN_TRAINING',
      path: '/vendor/training',
      portal: 'vendor',
      componentName: 'Training',
      componentFile: 'modules/vendor/pages/Training.jsx',
      guard: 'ProtectedRoute',
      requiredRole: 'vendor',
      params: [],
      needsSeededEntity: false
    },

    // Worker Routes
    {
      routeId: 'WRK_LOGIN',
      path: '/worker/login',
      portal: 'worker',
      componentName: 'Login',
      componentFile: 'modules/worker/pages/login/index.jsx',
      guard: 'PublicRoute',
      requiredRole: 'public',
      params: [],
      needsSeededEntity: false
    },
    {
      routeId: 'WRK_DASHBOARD',
      path: '/worker/dashboard',
      portal: 'worker',
      componentName: 'Dashboard',
      componentFile: 'modules/worker/pages/Dashboard.jsx',
      guard: 'ProtectedRoute',
      requiredRole: 'worker',
      params: [],
      needsSeededEntity: false
    },
    {
      routeId: 'WRK_JOBS',
      path: '/worker/jobs',
      portal: 'worker',
      componentName: 'AssignedJobs',
      componentFile: 'modules/worker/pages/AssignedJobs.jsx',
      guard: 'ProtectedRoute',
      requiredRole: 'worker',
      params: [],
      needsSeededEntity: false
    },
    {
      routeId: 'WRK_JOB_DETAILS',
      path: '/worker/job/:id',
      portal: 'worker',
      componentName: 'JobDetails',
      componentFile: 'modules/worker/pages/JobDetails.jsx',
      guard: 'ProtectedRoute',
      requiredRole: 'worker',
      params: ['id'],
      needsSeededEntity: true,
      precondition: 'Requires assigned job ID'
    },
    {
      routeId: 'WRK_JOB_MAP',
      path: '/worker/job/:id/map',
      portal: 'worker',
      componentName: 'JobMap',
      componentFile: 'modules/worker/pages/JobMap.jsx',
      guard: 'ProtectedRoute',
      requiredRole: 'worker',
      params: ['id'],
      needsSeededEntity: true,
      precondition: 'Requires transit job ID'
    },

    // Admin Routes
    {
      routeId: 'ADM_LOGIN',
      path: '/admin/login',
      portal: 'admin',
      componentName: 'Login',
      componentFile: 'modules/admin/pages/login/index.jsx',
      guard: 'PublicRoute',
      requiredRole: 'public',
      params: [],
      needsSeededEntity: false
    },
    {
      routeId: 'ADM_DASHBOARD',
      path: '/admin/dashboard',
      portal: 'admin',
      componentName: 'Dashboard',
      componentFile: 'modules/admin/pages/Dashboard.jsx',
      guard: 'ProtectedRoute',
      requiredRole: 'admin',
      params: [],
      needsSeededEntity: false
    },
    {
      routeId: 'ADM_BOOKINGS',
      path: '/admin/bookings',
      portal: 'admin',
      componentName: 'Bookings',
      componentFile: 'modules/admin/pages/Bookings.jsx',
      guard: 'ProtectedRoute',
      requiredRole: 'admin',
      params: [],
      needsSeededEntity: false
    },
    {
      routeId: 'ADM_BOOKING_DETAILS',
      path: '/admin/bookings/:id',
      portal: 'admin',
      componentName: 'BookingDetails',
      componentFile: 'modules/admin/pages/Bookings/BookingDetails.jsx',
      guard: 'ProtectedRoute',
      requiredRole: 'admin',
      params: ['id'],
      needsSeededEntity: true,
      precondition: 'Requires booking ID'
    },
    {
      routeId: 'ADM_USERS',
      path: '/admin/users',
      portal: 'admin',
      componentName: 'Users',
      componentFile: 'modules/admin/pages/Users.jsx',
      guard: 'ProtectedRoute',
      requiredRole: 'admin',
      params: [],
      needsSeededEntity: false
    },
    {
      routeId: 'ADM_VENDORS',
      path: '/admin/vendors',
      portal: 'admin',
      componentName: 'Vendors',
      componentFile: 'modules/admin/pages/Vendors.jsx',
      guard: 'ProtectedRoute',
      requiredRole: 'admin',
      params: [],
      needsSeededEntity: false
    },
    {
      routeId: 'ADM_POLICE_VERIF',
      path: '/admin/vendors/police-verification',
      portal: 'admin',
      componentName: 'PoliceVerification',
      componentFile: 'modules/admin/pages/PoliceVerification.jsx',
      guard: 'SuperAdminRoute',
      requiredRole: 'admin',
      params: [],
      needsSeededEntity: false
    },
    {
      routeId: 'ADM_SOS',
      path: '/admin/sos-alerts',
      portal: 'admin',
      componentName: 'SOSAlerts',
      componentFile: 'modules/admin/pages/SOSAlerts.jsx',
      guard: 'ProtectedRoute',
      requiredRole: 'admin',
      params: [],
      needsSeededEntity: false
    },
    {
      routeId: 'ADM_SETTINGS',
      path: '/admin/settings',
      portal: 'admin',
      componentName: 'Settings',
      componentFile: 'modules/admin/pages/Settings.jsx',
      guard: 'ProtectedRoute',
      requiredRole: 'admin',
      params: [],
      needsSeededEntity: false
    }
  ];

  fs.writeFileSync(path.join(ANALYSIS_DIR, 'routes.json'), JSON.stringify(routes, null, 2), 'utf8');
  console.log(`[Static Analysis] Discovered & classified ${routes.length} key routes -> analysis/routes.json`);

  function resolveComponentFile(baseDir: string, relPath: string): string | null {
    const candidates = [
      path.join(baseDir, relPath),
      path.join(baseDir, relPath.replace(/\.jsx$/, '/index.jsx')),
      path.join(baseDir, relPath.replace(/\/index\.jsx$/, '.jsx')),
      path.join(baseDir, relPath.replace(/\.jsx$/, '.tsx')),
      path.join(baseDir, relPath.replace(/\.jsx$/, '/index.tsx'))
    ];
    for (const c of candidates) {
      if (fs.existsSync(c)) return c;
    }
    return null;
  }

  // 2. Parse Component AST / Text for Interactive Elements
  const componentInventories: Record<string, ComponentElementInventory> = {};

  for (const route of routes) {
    const fullCompPath = resolveComponentFile(FRONTEND_SRC, route.componentFile);
    if (!fullCompPath) {
      continue;
    }

    const code = fs.readFileSync(fullCompPath, 'utf8');


    // Extract buttons
    const buttons: string[] = [];
    const buttonMatches = code.matchAll(/<button[^>]*>([\s\S]*?)<\/button>/gi);
    for (const m of buttonMatches) {
      const text = m[1].replace(/<[^>]+>/g, '').trim();
      if (text && text.length < 50) buttons.push(text);
    }

    // Extract inputs
    const inputs: string[] = [];
    const inputMatches = code.matchAll(/<input[^>]*name=["']([^"']+)["']/gi);
    for (const m of inputMatches) inputs.push(m[1]);
    const placeholderMatches = code.matchAll(/placeholder=["']([^"']+)["']/gi);
    for (const m of placeholderMatches) inputs.push(`placeholder:${m[1]}`);

    // Extract data-testid
    const dataTestIds: string[] = [];
    const testIdMatches = code.matchAll(/data-testid=["']([^"']+)["']/gi);
    for (const m of testIdMatches) dataTestIds.push(m[1]);

    // Extract aria-labels
    const ariaLabels: string[] = [];
    const ariaMatches = code.matchAll(/aria-label=["']([^"']+)["']/gi);
    for (const m of ariaMatches) ariaLabels.push(m[1]);

    // Extract navigate calls
    const navigatesTo: string[] = [];
    const navMatches = code.matchAll(/navigate\(["'`]([^"'`]+)["'`]\)/gi);
    for (const m of navMatches) navigatesTo.push(m[1]);

    // Extract sockets
    const socketEventsListened: string[] = [];
    const socketEventsEmitted: string[] = [];
    const onMatches = code.matchAll(/socket\.on\(["']([^"']+)["']/gi);
    for (const m of onMatches) socketEventsListened.push(m[1]);
    const emitMatches = code.matchAll(/socket\.emit\(["']([^"']+)["']/gi);
    for (const m of emitMatches) socketEventsEmitted.push(m[1]);

    // Extract child components
    const childComponents: string[] = [];
    const importMatches = code.matchAll(/import\s+([A-Z][a-zA-Z0-9]+)\s+from/g);
    for (const m of importMatches) childComponents.push(m[1]);

    componentInventories[route.routeId] = {
      componentName: route.componentName,
      componentPath: route.componentFile,
      buttons: Array.from(new Set(buttons)),
      links: [],
      inputs: Array.from(new Set(inputs)),
      forms: code.includes('<form') ? ['form'] : [],
      modals: code.includes('Modal') ? ['Modal'] : [],
      dataTestIds: Array.from(new Set(dataTestIds)),
      ariaLabels: Array.from(new Set(ariaLabels)),
      navigatesTo: Array.from(new Set(navigatesTo)),
      socketEventsListened: Array.from(new Set(socketEventsListened)),
      socketEventsEmitted: Array.from(new Set(socketEventsEmitted)),
      childComponents: Array.from(new Set(childComponents))
    };
  }

  fs.writeFileSync(path.join(ANALYSIS_DIR, 'components.json'), JSON.stringify(componentInventories, null, 2), 'utf8');
  console.log(`[Static Analysis] Extracted element inventories for ${Object.keys(componentInventories).length} components -> analysis/components.json`);

  console.log('\n✅ Phase 1 Static Analysis Complete.\n');
}

if (import.meta.url.endsWith(process.argv[1]) || process.argv[1]?.endsWith('static-analyzer.ts')) {
  runStaticAnalysis();
}

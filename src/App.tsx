/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Search, Plus, Minus, Globe, MapPin, Loader2, User, Compass, Briefcase, Building2, Settings, Users, Share2, Sparkles, ArrowLeft, Star, Crown, Check, ShieldCheck, Camera, Upload, LayoutDashboard, DollarSign, TrendingUp, CheckCircle, XCircle, Snowflake, Eye, AlertTriangle, Copy, ShieldAlert, Filter, Box, UserCircle, Trash2, Phone, Mail, Link as LinkIcon, Navigation, RefreshCw, Wrench, Hammer, Sliders, Layers, FileCheck, ClipboardList, Pencil, Calendar, Clock, Lock, LocateFixed } from 'lucide-react';
import { COUNTRIES_CURRENCIES, CountryCurrency, formatCurrency, parseUsdFromString } from './currencies';

// Fix Leaflet default marker icon issue in bundlers
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({
  iconUrl,
  iconRetinaUrl,
  shadowUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

// Web Audio API sound generator for icon clicks
const playClickSound = () => {
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(900, audioCtx.currentTime + 0.07);
    gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.07);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.07);
  } catch (e) {}
};

// Web Audio API notification chime for newly created gig posts & seekers
const playNewListingSound = () => {
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const notes = [523.25, 659.25, 783.99];
    notes.forEach((freq, idx) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      const start = audioCtx.currentTime + idx * 0.075;
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0.001, start);
      gain.gain.exponentialRampToValueAtTime(0.12, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.22);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(start);
      osc.stop(start + 0.22);
    });
  } catch (e) {}
};

const TOOL_ICON_POOL = [
  { Icon: Wrench, color: 'text-blue-500' },
  { Icon: Hammer, color: 'text-amber-500' },
  { Icon: Compass, color: 'text-indigo-500' },
  { Icon: Sliders, color: 'text-emerald-500' },
  { Icon: Layers, color: 'text-purple-500' },
  { Icon: Settings, color: 'text-slate-500' },
  { Icon: MapPin, color: 'text-rose-500' },
  { Icon: Navigation, color: 'text-cyan-500' },
  { Icon: Briefcase, color: 'text-sky-500' },
  { Icon: Box, color: 'text-violet-500' },
  { Icon: Globe, color: 'text-teal-500' },
  { Icon: Crown, color: 'text-yellow-500' },
  { Icon: Sparkles, color: 'text-pink-500' }
];

// Reusable component rendering randomized floating tools inside any feature bar or panel
function FloatingToolsBackdrop({ count = 7, compact = false, className = '' }: { count?: number; compact?: boolean; className?: string }) {
  const items = useMemo(() => {
    return Array.from({ length: count }).map((_, idx) => {
      const picked = TOOL_ICON_POOL[Math.floor(Math.random() * TOOL_ICON_POOL.length)];
      return {
        id: idx,
        Icon: picked.Icon,
        color: picked.color,
        top: `${Math.floor(5 + Math.random() * 82)}%`,
        left: `${Math.floor(3 + Math.random() * 90)}%`,
        rotate: Math.floor(-28 + Math.random() * 56),
        delay: `${(Math.random() * 4).toFixed(2)}s`,
        duration: `${(6 + Math.random() * 6).toFixed(2)}s`,
        sizeClass: compact
          ? ['w-3.5 h-3.5', 'w-4 h-4', 'w-5 h-5'][Math.floor(Math.random() * 3)]
          : ['w-6 h-6', 'w-8 h-8', 'w-10 h-10', 'w-12 h-12'][Math.floor(Math.random() * 4)]
      };
    });
  }, [count, compact]);

  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none select-none z-0 ${className}`}>
      {items.map(item => {
        const IconComp = item.Icon;
        return (
          <div
            key={item.id}
            style={{
              top: item.top,
              left: item.left,
              animationDelay: item.delay,
              animationDuration: item.duration
            }}
            className="absolute animate-float-tool"
          >
            <IconComp
              style={{ transform: `rotate(${item.rotate}deg)` }}
              className={`${item.sizeClass} ${item.color} ${compact ? 'opacity-20 blur-[0.5px]' : 'opacity-35 blur-[3px]'}`}
            />
          </div>
        );
      })}
    </div>
  );
}

interface SearchResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
}

interface GigRating {
  id: string;
  gigId: string;
  gigTitle: string;
  rating: number;
  comment?: string;
  ratedBy: string;
  ratedAt: string;
}

interface GigItem {
  id: string;
  title: string;
  description: string;
  locationName?: string;
  lat: number;
  lng: number;
  budget: string;
  budgetUsd?: number;
  scheduleType?: 'immediate' | 'scheduled';
  scheduledDate?: string;
  scheduledTime?: string;
  creatorEmail?: string;
  creatorName?: string;
  status?: 'open' | 'pending_acceptance' | 'in_progress' | 'completed';
  applicantEmail?: string;
  applicantName?: string;
  appliedAt?: number;
  rating?: number;
}

interface CompanyItem {
  id: string;
  name: string;
  category: string;
  lat: number;
  lng: number;
  address: string;
}

interface SeekerItem {
  id: string;
  name: string;
  skill: string;
  rate: string;
  rateUsd?: number;
  rating: number;
  lat: number;
  lng: number;
  status: string;
}

interface ReferralItem {
  id: string;
  username: string;
  joinedDate: string;
  tenantCode: string;
  countryCode?: string;
  countryName?: string;
  countryFlag?: string;
  status: 'Approved' | 'Pending' | 'Frozen' | 'Rejected' | string;
  commissionEarned?: string;
  commissionUsd?: number;
  activitiesCount?: number;
  lastActive?: string;
  freezeReason?: string;
  trialDays?: number;
  trialEndsDate?: string;
}

interface SubSubmissionItem {
  id: string;
  email: string;
  plan: 'tenant' | 'user';
  selfieImage: string | null;
  idFileName: string;
  countryCode: string;
  countryName: string;
  countryFlag: string;
  submittedAt: string;
  status: 'Pending' | 'Approved' | 'Rejected';
}

interface SocialLink {
  id: string;
  platform: string;
  url: string;
}

interface UserProfile {
  name: string;
  surname: string;
  selfieImage: string | null;
  location: string;
  lat?: number;
  lng?: number;
  autoLocation: boolean;
  email: string;
  phone: string;
  socialLinks: SocialLink[];
  ratings?: GigRating[];
}

export default function App() {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const searchMarkerRef = useRef<L.Marker | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const userAccuracyCircleRef = useRef<L.Circle | null>(null);
  const userCoordsRef = useRef<{ lat: number; lng: number } | null>(null);

  // 3D perspective mode state
  const [is3DMode, setIs3DMode] = useState<boolean>(false);
  const [isLocatingMap, setIsLocatingMap] = useState<boolean>(false);
  const [gigWaitNowMs, setGigWaitNowMs] = useState<number>(() => Date.now());
  const notifiedTimeoutGigIdsRef = useRef<Set<string>>(new Set());

  // Profile Modal & state with localStorage persistence
  const [profileModalOpen, setProfileModalOpen] = useState<boolean>(false);
  const [isLocatingProfile, setIsLocatingProfile] = useState<boolean>(false);
  const [profileSavedToast, setProfileSavedToast] = useState<boolean>(false);
  const [profileWebcamActive, setProfileWebcamActive] = useState<boolean>(false);
  const profileWebcamRef = useRef<HTMLVideoElement>(null);
  const profileMediaStreamRef = useRef<MediaStream | null>(null);
  const [profileCameraError, setProfileCameraError] = useState<string | null>(null);

  const [userProfile, setUserProfile] = useState<UserProfile>(() => {
    try {
      const stored = localStorage.getItem('geo_osm_user_profile');
      if (stored) {
        const parsed = JSON.parse(stored);
        // Strip legacy mock Unsplash URL or placeholder profile if previously cached
        if (typeof parsed.selfieImage === 'string' && parsed.selfieImage.includes('unsplash.com')) {
          parsed.selfieImage = null;
        }
        return parsed;
      }
    } catch (e) {}
    return {
      name: '',
      surname: '',
      selfieImage: null,
      location: '',
      autoLocation: false,
      email: '',
      phone: '',
      socialLinks: []
    };
  });

  // Search state & live autocomplete
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);

  // Seekers filter search state
  const [seekerSearchQuery, setSeekerSearchQuery] = useState<string>('');
  // Referrals filter search state
  const [referralSearchQuery, setReferralSearchQuery] = useState<string>('');

  // Satellite mode state
  const [isSatellite, setIsSatellite] = useState<boolean>(false);

  // Auth & User state with localStorage persistence
  const [authModalOpen, setAuthModalOpen] = useState<boolean>(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>(() => {
    try {
      const stored = localStorage.getItem('geo_osm_registered_users');
      const users = stored ? JSON.parse(stored) : {};
      return Object.keys(users).length > 0 ? 'signin' : 'signup';
    } catch (e) {
      return 'signup';
    }
  });
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [userLoggedIn, setUserLoggedIn] = useState<string | null>(() => {
    try {
      return localStorage.getItem('geo_osm_logged_user');
    } catch (e) {
      return null;
    }
  });
  const [authError, setAuthError] = useState<string | null>(null);
  const [referralCodeInput, setReferralCodeInput] = useState<string>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      return params.get('ref') || '';
    } catch (e) {
      return '';
    }
  });
  const [referralTrialEndsAt, setReferralTrialEndsAt] = useState<number | null>(() => {
    try {
      const stored = localStorage.getItem('geo_osm_referral_trial_ends');
      return stored ? parseInt(stored, 10) : null;
    } catch (e) {
      return null;
    }
  });

  // Phone Menu state
  const [phoneMenuOpen, setPhoneMenuOpen] = useState<boolean>(false);

  // Subscription states stored in localStorage
  const [tenantSubActive, setTenantSubActive] = useState<boolean>(() => {
    return localStorage.getItem('geo_osm_tenant_sub') === 'true';
  });
  const [userSubActive, setUserSubActive] = useState<boolean>(() => {
    return localStorage.getItem('geo_osm_user_sub') === 'true';
  });

  // Upgrade verification flow state
  const [upgradeModalOpen, setUpgradeModalOpen] = useState<boolean>(false);
  const [selectedSubPlan, setSelectedSubPlan] = useState<'tenant' | 'user' | null>(null);
  const [verificationStep, setVerificationStep] = useState<'boxes' | 'capture' | 'review' | 'success'>('boxes');
  const [selfieImage, setSelfieImage] = useState<string | null>(null);
  const [idDocumentFile, setIdDocumentFile] = useState<File | null>(null);
  const [reviewSecondsLeft, setReviewSecondsLeft] = useState<number>(20);
  const webcamRef = useRef<HTMLVideoElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const [webcamActive, setWebcamActive] = useState<boolean>(false);
  const [cameraPermissionError, setCameraPermissionError] = useState<string | null>(null);

  // Create, Edit, Apply & Navigation Gig state with localStorage (No mock/demo gigs)
  const [createGigModal, setCreateGigModal] = useState<boolean>(false);
  const [gigTitle, setGigTitle] = useState<string>('');
  const [gigDesc, setGigDesc] = useState<string>('');
  const [gigBudget, setGigBudget] = useState<string>('');
  const [gigScheduleType, setGigScheduleType] = useState<'immediate' | 'scheduled'>('immediate');
  const [gigScheduledDate, setGigScheduledDate] = useState<string>('');
  const [gigScheduledTime, setGigScheduledTime] = useState<string>('');
  const [gigCongratsModal, setGigCongratsModal] = useState<GigItem | null>(null);
  const [isStreetViewNav, setIsStreetViewNav] = useState<boolean>(false);
  const [gigLocationQuery, setGigLocationQuery] = useState<string>('');
  const [gigLocationResults, setGigLocationResults] = useState<SearchResult[]>([]);
  const [isSearchingGigLocation, setIsSearchingGigLocation] = useState<boolean>(false);
  const [gigSelectedCoords, setGigSelectedCoords] = useState<{ lat: number; lng: number } | null>(null);
  const gigLocationJustPickedRef = useRef<boolean>(false);
  const [gigs, setGigs] = useState<GigItem[]>(() => {
    try {
      const stored = localStorage.getItem('geo_osm_gigs');
      if (stored !== null) {
        const parsed: GigItem[] = JSON.parse(stored);
        return parsed.filter(g => g.creatorEmail !== 'host.partner@geo-osm.app');
      }
    } catch (e) {}
    return [];
  });
  const [activeMapGigId, setActiveMapGigId] = useState<string | null>(null);
  const [editingGig, setEditingGig] = useState<GigItem | null>(null);
  const [editGigTitle, setEditGigTitle] = useState<string>('');
  const [editGigDesc, setEditGigDesc] = useState<string>('');
  const [editGigBudget, setEditGigBudget] = useState<string>('');
  const [editGigScheduleType, setEditGigScheduleType] = useState<'immediate' | 'scheduled'>('immediate');
  const [editGigScheduledDate, setEditGigScheduledDate] = useState<string>('');
  const [editGigScheduledTime, setEditGigScheduledTime] = useState<string>('');
  const [editGigLocationQuery, setEditGigLocationQuery] = useState<string>('');
  const [editGigLocationResults, setEditGigLocationResults] = useState<SearchResult[]>([]);
  const [isSearchingEditGigLocation, setIsSearchingEditGigLocation] = useState<boolean>(false);
  const [editGigSelectedCoords, setEditGigSelectedCoords] = useState<{ lat: number; lng: number } | null>(null);
  const editGigLocationJustPickedRef = useRef<boolean>(false);
  const [completingGig, setCompletingGig] = useState<GigItem | null>(null);
  const [ratingStars, setRatingStars] = useState<number>(5);
  const [ratingComment, setRatingComment] = useState<string>('');
  const [gigNoticeBanner, setGigNoticeBanner] = useState<string | null>(null);
  const [userRatingsMap, setUserRatingsMap] = useState<Record<string, GigRating[]>>(() => {
    try {
      const stored = localStorage.getItem('geo_osm_user_ratings');
      if (stored) return JSON.parse(stored);
    } catch (e) {}
    return {};
  });

  const [addCompanyModal, setAddCompanyModal] = useState<boolean>(false);
  const [companyName, setCompanyName] = useState<string>('');
  const [companyCategory, setCompanyCategory] = useState<string>('Technology');
  const [companyAddress, setCompanyAddress] = useState<string>('');
  const [companies, setCompanies] = useState<CompanyItem[]>(() => {
    try {
      const stored = localStorage.getItem('geo_osm_companies');
      if (stored) return JSON.parse(stored);
    } catch (e) {}
    return [];
  });

  // Fullscreen Views state: 'map' | 'seekers' | 'referrals' | 'tenant-dash'
  const [currentView, setCurrentView] = useState<'map' | 'seekers' | 'referrals' | 'tenant-dash'>('map');

  // Country & Currency state with localStorage persistence
  const [selectedCountry, setSelectedCountry] = useState<CountryCurrency>(() => {
    try {
      const stored = localStorage.getItem('geo_osm_country');
      if (stored) {
        const parsed = JSON.parse(stored);
        const found = COUNTRIES_CURRENCIES.find(c => c.code === parsed.code);
        if (found) return found;
      }
    } catch (e) {}
    return COUNTRIES_CURRENCIES[0];
  });
  const [countryModalOpen, setCountryModalOpen] = useState<boolean>(false);
  const [countrySearchQuery, setCountrySearchQuery] = useState<string>('');
  const [countryLocked, setCountryLocked] = useState<boolean>(() => {
    try {
      return localStorage.getItem('geo_osm_country_locked') === 'true';
    } catch (e) {
      return false;
    }
  });

  // Real Seekers list persisted in localStorage (no mock/demo seekers)
  const [seekers, setSeekers] = useState<SeekerItem[]>(() => {
    try {
      const stored = localStorage.getItem('geo_osm_seekers');
      if (stored) return JSON.parse(stored);
    } catch (e) {}
    return [];
  });
  const [registerSeekerSkill, setRegisterSeekerSkill] = useState<string>('');
  const [registerSeekerRate, setRegisterSeekerRate] = useState<string>('');
  const [selectedSeekerForHire, setSelectedSeekerForHire] = useState<SeekerItem | null>(null);
  const [hireGigTitle, setHireGigTitle] = useState<string>('');

  // Referrals list data reset to 0 referrals & 0 earnings
  const [referrals, setReferrals] = useState<ReferralItem[]>(() => {
    try {
      const stored = localStorage.getItem('geo_osm_referrals_v3');
      if (stored) return JSON.parse(stored);
    } catch (e) {}
    return [];
  });
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [referralStatusFilter, setReferralStatusFilter] = useState<'all' | 'pending' | 'approved' | 'frozen' | 'rejected'>('all');
  const [selectedReferralForView, setSelectedReferralForView] = useState<ReferralItem | null>(null);
  const [freezeModalOpen, setFreezeModalOpen] = useState<boolean>(false);
  const [referralToFreeze, setReferralToFreeze] = useState<ReferralItem | null>(null);
  const [freezeReasonInput, setFreezeReasonInput] = useState<string>('Rule Violation: Failed to follow platform safety and listing regulations.');

  // Tenant Profit Balances reset to 0.00 across all currencies
  const [tenantSubProfit] = useState<number>(0);
  const [userSubProfit] = useState<number>(0);
  const totalProfitBalance = tenantSubProfit + userSubProfit;

  // Tenant Dashboard Top Bar navigation & editable subscription fees + submissions queues
  const [tenantDashTab, setTenantDashTab] = useState<'profits' | 'referrals' | 'fees' | 'tenant-subs' | 'user-subs'>('profits');
  const [tenantSubFeeUsd, setTenantSubFeeUsd] = useState<number>(() => {
    try {
      const stored = localStorage.getItem('geo_osm_tenant_fee_usd');
      if (stored) {
        const parsed = parseFloat(stored);
        if (!isNaN(parsed) && parsed >= 0) return parsed;
      }
    } catch (e) {}
    return 49;
  });
  const [userSubFeeUsd, setUserSubFeeUsd] = useState<number>(() => {
    try {
      const stored = localStorage.getItem('geo_osm_user_fee_usd');
      if (stored) {
        const parsed = parseFloat(stored);
        if (!isNaN(parsed) && parsed >= 0) return parsed;
      }
    } catch (e) {}
    return 15;
  });
  const [tenantFeeDraft, setTenantFeeDraft] = useState<string>(() => (49 * selectedCountry.rateFromUsd).toFixed(2));
  const [userFeeDraft, setUserFeeDraft] = useState<string>(() => (15 * selectedCountry.rateFromUsd).toFixed(2));
  const [feeSavedNotice, setFeeSavedNotice] = useState<boolean>(false);

  const [subSubmissions, setSubSubmissions] = useState<SubSubmissionItem[]>(() => {
    try {
      const stored = localStorage.getItem('geo_osm_sub_submissions');
      if (stored) return JSON.parse(stored);
    } catch (e) {}
    return [];
  });
  const [selectedSubmissionForView, setSelectedSubmissionForView] = useState<SubSubmissionItem | null>(null);

  // Referral Tenants cannot earn outside their selected country
  const isReferralSameCountry = (ref: ReferralItem) => {
    const refCountry = ref.countryCode || selectedCountry.code;
    return refCountry === selectedCountry.code;
  };

  const getReferralEffectiveCommissionUsd = (ref: ReferralItem) => {
    if (!isReferralSameCountry(ref)) return 0;
    return ref.commissionUsd || 0;
  };

  // Every referral using the app gets a 30-day free trial
  const getReferralTrialInfo = (ref: ReferralItem) => {
    const baseDays = ref.trialDays ?? 30;
    const joinMs = Date.parse(ref.joinedDate);
    const startMs = isNaN(joinMs) ? Date.now() : joinMs;
    const endMs = ref.trialEndsDate ? Date.parse(ref.trialEndsDate) : startMs + baseDays * 86400000;
    const daysLeft = Math.max(0, Math.min(30, Math.ceil((endMs - Date.now()) / 86400000)));
    const endsDateStr = new Date(endMs).toISOString().split('T')[0];
    return {
      totalDays: 30,
      daysLeft,
      endsDateStr,
      isActive: daysLeft > 0
    };
  };

  const userTrialDaysLeft = referralTrialEndsAt
    ? Math.max(0, Math.ceil((referralTrialEndsAt - Date.now()) / 86400000))
    : 0;

  // Settings Modal state
  const [settingsModalOpen, setSettingsModalOpen] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // Marker layer groups
  const gigsMarkersRef = useRef<L.LayerGroup | null>(null);
  const companiesMarkersRef = useRef<L.LayerGroup | null>(null);
  const seekersMarkersRef = useRef<L.LayerGroup | null>(null);
  const routeLayerRef = useRef<L.LayerGroup | null>(null);
  const lastNavigatedGigIdRef = useRef<string | null>(null);

  const currentUserEmail = (userLoggedIn || userProfile.email || '').trim().toLowerCase();
  const currentUserName = `${userProfile.name} ${userProfile.surname}`.trim() || currentUserEmail || 'User';

  const prevGigsLengthRef = useRef<number>(gigs.length);
  const prevSeekersLengthRef = useRef<number>(seekers.length);

  useEffect(() => {
    localStorage.setItem('geo_osm_country', JSON.stringify(selectedCountry));
  }, [selectedCountry]);

  useEffect(() => {
    localStorage.setItem('geo_osm_seekers', JSON.stringify(seekers));
    if (seekers.length > prevSeekersLengthRef.current && soundEnabled) {
      playNewListingSound();
    }
    prevSeekersLengthRef.current = seekers.length;
  }, [seekers, soundEnabled]);

  // Ensure Leaflet tiles stay synced when toggling 3D perspective
  useEffect(() => {
    if (!mapRef.current) return;
    const t = setTimeout(() => mapRef.current?.invalidateSize({ animate: false }), 100);
    return () => clearTimeout(t);
  }, [is3DMode]);

  useEffect(() => {
    localStorage.setItem('geo_osm_gigs', JSON.stringify(gigs));
  }, [gigs]);

  useEffect(() => {
    localStorage.setItem('geo_osm_companies', JSON.stringify(companies));
  }, [companies]);

  useEffect(() => {
    localStorage.setItem('geo_osm_tenant_sub', String(tenantSubActive));
  }, [tenantSubActive]);

  useEffect(() => {
    localStorage.setItem('geo_osm_user_sub', String(userSubActive));
  }, [userSubActive]);

  useEffect(() => {
    localStorage.setItem('geo_osm_referrals_v3', JSON.stringify(referrals));
  }, [referrals]);

  useEffect(() => {
    localStorage.setItem('geo_osm_tenant_fee_usd', String(tenantSubFeeUsd));
  }, [tenantSubFeeUsd]);

  useEffect(() => {
    localStorage.setItem('geo_osm_user_fee_usd', String(userSubFeeUsd));
  }, [userSubFeeUsd]);

  useEffect(() => {
    setTenantFeeDraft((tenantSubFeeUsd * selectedCountry.rateFromUsd).toFixed(2));
    setUserFeeDraft((userSubFeeUsd * selectedCountry.rateFromUsd).toFixed(2));
  }, [selectedCountry, tenantSubFeeUsd, userSubFeeUsd]);

  useEffect(() => {
    localStorage.setItem('geo_osm_sub_submissions', JSON.stringify(subSubmissions));
  }, [subSubmissions]);

  useEffect(() => {
    localStorage.setItem('geo_osm_user_profile', JSON.stringify(userProfile));
  }, [userProfile]);

  useEffect(() => {
    localStorage.setItem('geo_osm_user_ratings', JSON.stringify(userRatingsMap));
  }, [userRatingsMap]);

  // Real-time cross-tab sync so new gigs, seekers, owner acceptances and ratings propagate with sound
  useEffect(() => {
    const handleStorageSync = (e: StorageEvent) => {
      if (e.key === 'geo_osm_gigs' && e.newValue) {
        try {
          const updatedGigs: GigItem[] = JSON.parse(e.newValue);
          if (updatedGigs.length > prevGigsLengthRef.current && soundEnabled) {
            playNewListingSound();
          }
          prevGigsLengthRef.current = updatedGigs.length;
          setGigs(updatedGigs);
          const acceptedForUser = updatedGigs.find(
            g => g.status === 'in_progress' && g.applicantEmail?.toLowerCase() === currentUserEmail
          );
          if (acceptedForUser && lastNavigatedGigIdRef.current !== acceptedForUser.id) {
            setCurrentView('map');
            setActiveMapGigId(acceptedForUser.id);
          }
        } catch (err) {}
      }
      if (e.key === 'geo_osm_seekers' && e.newValue) {
        try {
          const updatedSeekers: SeekerItem[] = JSON.parse(e.newValue);
          if (updatedSeekers.length > prevSeekersLengthRef.current && soundEnabled) {
            playNewListingSound();
          }
          prevSeekersLengthRef.current = updatedSeekers.length;
          setSeekers(updatedSeekers);
        } catch (err) {}
      }
      if (e.key === 'geo_osm_user_ratings' && e.newValue) {
        try {
          setUserRatingsMap(JSON.parse(e.newValue));
        } catch (err) {}
      }
    };
    window.addEventListener('storage', handleStorageSync);
    return () => window.removeEventListener('storage', handleStorageSync);
  }, [currentUserEmail, soundEnabled]);

  useEffect(() => {
    if (selfieImage && !userProfile.selfieImage) {
      setUserProfile(prev => ({ ...prev, selfieImage }));
    }
  }, [selfieImage]);

  useEffect(() => {
    if (userLoggedIn) {
      localStorage.setItem('geo_osm_logged_user', userLoggedIn);
    } else {
      localStorage.removeItem('geo_osm_logged_user');
    }
  }, [userLoggedIn]);

  // Track elapsed wait time for gig applications and alert if owner does not respond within 60 seconds
  const hasPendingUserGig = gigs.some(
    g =>
      g.status === 'pending_acceptance' &&
      Boolean(currentUserEmail) &&
      (g.applicantEmail || '').toLowerCase() === currentUserEmail
  );

  useEffect(() => {
    if (!hasPendingUserGig) {
      notifiedTimeoutGigIdsRef.current.clear();
      return;
    }
    setGigWaitNowMs(Date.now());
    const interval = window.setInterval(() => {
      const now = Date.now();
      setGigWaitNowMs(now);
      gigs.forEach(g => {
        if (
          g.status === 'pending_acceptance' &&
          (g.applicantEmail || '').toLowerCase() === currentUserEmail &&
          g.appliedAt &&
          now - g.appliedAt > 60000 &&
          !notifiedTimeoutGigIdsRef.current.has(g.id)
        ) {
          notifiedTimeoutGigIdsRef.current.add(g.id);
          if (soundEnabled) playNewListingSound();
          setGigNoticeBanner(`No response yet from "${g.title}" owner after 60 seconds.`);
        }
      });
    }, 1000);
    return () => window.clearInterval(interval);
  }, [hasPendingUserGig, gigs, currentUserEmail, soundEnabled]);

  // Clean up media stream when leaving capture step
  useEffect(() => {
    if (verificationStep !== 'capture') {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(t => t.stop());
        mediaStreamRef.current = null;
      }
      setWebcamActive(false);
    }
  }, [verificationStep]);

  // Review timer countdown for subscription verification
  useEffect(() => {
    let interval: any;
    if (verificationStep === 'review' && reviewSecondsLeft > 0) {
      interval = setInterval(() => {
        setReviewSecondsLeft(prev => {
          if (prev <= 1) {
            setVerificationStep('success');
            if (selectedSubPlan === 'tenant') {
              setTenantSubActive(true);
              setUserSubActive(false);
            }
            if (selectedSubPlan === 'user') {
              setUserSubActive(true);
              setTenantSubActive(false);
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [verificationStep, reviewSecondsLeft, selectedSubPlan]);

  // Generate user location marker icon with face selfie if available
  const getUserMarkerIcon = (selfieUrl: string | null) => {
    if (selfieUrl) {
      return L.divIcon({
        className: 'custom-user-selfie-marker',
        html: `
          <div class="relative flex items-center justify-center cursor-pointer group">
            <div class="absolute w-14 h-14 bg-blue-500 rounded-full opacity-40 animate-ping pointer-events-none"></div>
            <div class="relative w-12 h-12 rounded-full p-0.5 bg-gradient-to-tr from-blue-600 via-indigo-600 to-amber-500 shadow-2xl border-2 border-white overflow-hidden transition transform group-hover:scale-110">
              <img src="${selfieUrl}" class="w-full h-full object-cover rounded-full" alt="User Face Selfie" />
            </div>
            <div class="absolute -bottom-1.5 w-4 h-4 bg-blue-600 border-2 border-white rounded-full shadow-md flex items-center justify-center text-white text-[8px] font-black">📍</div>
          </div>
        `,
        iconSize: [48, 48],
        iconAnchor: [24, 24],
        popupAnchor: [0, -24]
      });
    }
    return L.divIcon({
      className: 'custom-user-location-marker',
      html: `<div class="relative flex items-center justify-center w-6 h-6"><div class="absolute w-6 h-6 bg-blue-500 rounded-full opacity-40 animate-ping"></div><div class="w-4 h-4 bg-blue-600 border-2 border-white rounded-full shadow-md"></div></div>`,
      iconSize: [24, 24],
      iconAnchor: [12, 12],
      popupAnchor: [0, -12]
    });
  };

  // Update map marker when selfie or profile changes
  useEffect(() => {
    const currentSelfie = userProfile.selfieImage || selfieImage;
    if (userMarkerRef.current) {
      userMarkerRef.current.setIcon(getUserMarkerIcon(currentSelfie));
      userMarkerRef.current.setPopupContent(`
        <div class="p-2 min-w-[160px] text-center">
          ${currentSelfie ? `<img src="${currentSelfie}" class="w-12 h-12 rounded-full mx-auto object-cover border-2 border-blue-600 mb-1.5 shadow-md" />` : ''}
          <h4 class="font-bold text-sm text-gray-900">${userProfile.name} ${userProfile.surname}</h4>
          <p class="text-[11px] text-blue-600 font-semibold mt-0.5">Your Location on Map</p>
        </div>
      `);
    }
  }, [userProfile.selfieImage, selfieImage, userProfile.name, userProfile.surname]);

  // Map view transition optimization: resize and render tiles instantly
  useEffect(() => {
    if (currentView === 'map' && mapRef.current) {
      const timer = setTimeout(() => {
        mapRef.current?.invalidateSize();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [currentView]);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [51.505, -0.09],
        zoom: 13,
        zoomControl: false,
        attributionControl: false,
        preferCanvas: true,
        wheelDebounceTime: 30,
        fadeAnimation: true,
        markerZoomAnimation: true,
        inertia: true,
        inertiaDeceleration: 3500
      });

      // Ultra-fast multi-subdomain OpenStreetMap tile layer with memory buffer
      const initialTileUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
      const tileLayer = L.tileLayer(initialTileUrl, {
        subdomains: ['a', 'b', 'c'],
        maxZoom: 19,
        keepBuffer: 8,
        updateWhenIdle: false,
        updateWhenZooming: true,
        crossOrigin: true,
        attribution: ''
      }).addTo(map);

      tileLayerRef.current = tileLayer;
      mapRef.current = map;

      const gigsGroup = L.layerGroup().addTo(map);
      gigsMarkersRef.current = gigsGroup;

      const compGroup = L.layerGroup().addTo(map);
      companiesMarkersRef.current = compGroup;

      const seekersGroup = L.layerGroup().addTo(map);
      seekersMarkersRef.current = seekersGroup;

      const routeGroup = L.layerGroup().addTo(map);
      routeLayerRef.current = routeGroup;

      // Place user marker on map using real selfie if provided (no placeholder stock URL)
      const startSelfie = userProfile.selfieImage || selfieImage || null;
      const startLat = userProfile.lat || 51.505;
      const startLng = userProfile.lng || -0.09;
      userCoordsRef.current = { lat: startLat, lng: startLng };

      const startIcon = getUserMarkerIcon(startSelfie);
      const initialMarker = L.marker([startLat, startLng], { icon: startIcon }).addTo(map);
      initialMarker.bindPopup(`
        <div class="p-2 min-w-[160px] text-center">
          ${startSelfie ? `<img src="${startSelfie}" class="w-12 h-12 rounded-full mx-auto object-cover border-2 border-blue-600 mb-1.5 shadow-md" />` : ''}
          <h4 class="font-bold text-sm text-gray-900">${userProfile.name || 'Your'} ${userProfile.surname || 'Location'}</h4>
          <p class="text-[11px] text-blue-600 font-semibold mt-0.5">Your Location on Map</p>
        </div>
      `);
      userMarkerRef.current = initialMarker;

      // Ultra-fast geolocation: immediate coarse/cached fix, followed by background refinement
      if (navigator.geolocation) {
        const updateUserLocation = (latitude: number, longitude: number, accuracy: number, pan: boolean) => {
          if (!mapRef.current) return;
          userCoordsRef.current = { lat: latitude, lng: longitude };
          if (pan) {
            mapRef.current.setView([latitude, longitude], 15, { animate: true });
          }
          const currentSelfie = userProfile.selfieImage || selfieImage;
          const userIcon = getUserMarkerIcon(currentSelfie);

          if (!userMarkerRef.current) {
            const marker = L.marker([latitude, longitude], { icon: userIcon }).addTo(mapRef.current);
            marker.bindPopup(`
              <div class="p-2 min-w-[160px] text-center">
                ${currentSelfie ? `<img src="${currentSelfie}" class="w-12 h-12 rounded-full mx-auto object-cover border-2 border-blue-600 mb-1.5 shadow-md" />` : ''}
                <h4 class="font-bold text-sm text-gray-900">${userProfile.name} ${userProfile.surname}</h4>
                <p class="text-[11px] text-blue-600 font-semibold mt-0.5">Your Location on Map</p>
              </div>
            `);
            userMarkerRef.current = marker;

            const circle = L.circle([latitude, longitude], {
              radius: accuracy || 25,
              color: '#3b82f6',
              fillColor: '#3b82f6',
              fillOpacity: 0.15,
              weight: 1
            }).addTo(mapRef.current);
            userAccuracyCircleRef.current = circle;
          } else {
            userMarkerRef.current.setLatLng([latitude, longitude]);
            userMarkerRef.current.setIcon(userIcon);
            if (userAccuracyCircleRef.current) {
              userAccuracyCircleRef.current.setLatLng([latitude, longitude]);
              userAccuracyCircleRef.current.setRadius(accuracy || 25);
            }
          }
        };

        // Fast cached fix (returns in milliseconds)
        navigator.geolocation.getCurrentPosition(
          pos => {
            updateUserLocation(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy, true);
          },
          err => {
            console.log('Fast location note:', err.message);
          },
          { enableHighAccuracy: false, timeout: 3500, maximumAge: 300000 }
        );

        // High accuracy refinement
        navigator.geolocation.getCurrentPosition(
          pos => {
            updateUserLocation(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy, false);
          },
          () => {},
          { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 }
        );
      }
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Update tile layer when satellite mode changes
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }

    const tileUrl = isSatellite
      ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
      : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

    const newLayer = L.tileLayer(tileUrl, {
      subdomains: isSatellite ? [] : ['a', 'b', 'c'],
      maxZoom: 19,
      keepBuffer: 12,
      updateWhenIdle: false,
      updateWhenZooming: true,
      crossOrigin: true,
      attribution: ''
    }).addTo(map);

    tileLayerRef.current = newLayer;
  }, [isSatellite]);

  // Render Seekers on map
  useEffect(() => {
    if (!seekersMarkersRef.current || !mapRef.current) return;
    const group = seekersMarkersRef.current;
    group.clearLayers();

    seekers.forEach(seeker => {
      const rateDisplay = formatCurrency(seeker.rateUsd || parseUsdFromString(seeker.rate) || 35, selectedCountry, 0) + '/hr';
      const marker = L.marker([seeker.lat, seeker.lng]);
      marker.bindPopup(`
        <div class="p-2 min-w-[180px]">
          <span class="text-[10px] bg-green-100 text-green-700 font-bold px-2 py-0.5 rounded-full">SEEKER</span>
          <h4 class="font-bold text-sm text-gray-900 mt-1">${seeker.name}</h4>
          <p class="text-xs text-gray-600 mb-1">${seeker.skill}</p>
          <div class="flex justify-between items-center text-xs font-semibold text-gray-800">
            <span>${rateDisplay}</span>
            <span class="text-amber-500">★ ${seeker.rating}</span>
          </div>
        </div>
      `);
      group.addLayer(marker);
    });
  }, [seekers, selectedCountry]);

  // Render Gigs on map & bind interactive Gig Card click + popup summary
  useEffect(() => {
    if (!gigsMarkersRef.current || !mapRef.current) return;
    const group = gigsMarkersRef.current;
    group.clearLayers();

    gigs.forEach(gig => {
      const budgetDisplay = gig.budgetUsd !== undefined
        ? formatCurrency(gig.budgetUsd, selectedCountry, 0)
        : gig.budget;
      const isOwner = (gig.creatorEmail || '').toLowerCase() === currentUserEmail;
      const statusBadge =
        gig.status === 'in_progress'
          ? '<span class="text-[10px] bg-indigo-100 text-indigo-700 font-bold px-2 py-0.5 rounded-full">IN PROGRESS</span>'
          : gig.status === 'pending_acceptance'
          ? '<span class="text-[10px] bg-amber-100 text-amber-700 font-bold px-2 py-0.5 rounded-full">WAITING</span>'
          : gig.status === 'completed'
          ? `<span class="text-[10px] bg-emerald-100 text-emerald-700 font-bold px-2 py-0.5 rounded-full">COMPLETED${gig.rating ? ` ★${gig.rating}` : ''}</span>`
          : '<span class="text-[10px] bg-blue-100 text-blue-700 font-bold px-2 py-0.5 rounded-full">GIG</span>';

      const scheduleBadge = gig.scheduleType === 'scheduled' && (gig.scheduledDate || gig.scheduledTime)
        ? `${gig.scheduledDate || ''} ${gig.scheduledTime || ''}`.trim()
        : 'Immediately';

      const marker = L.marker([gig.lat, gig.lng]);
      marker.bindPopup(`
        <div class="p-2 min-w-[190px]">
          <div class="flex items-center justify-between gap-1">
            ${statusBadge}
            ${isOwner ? '<span class="text-[9px] text-gray-500 font-bold">Your Post</span>' : ''}
          </div>
          <h4 class="font-bold text-sm text-gray-900 mt-1">${gig.title}</h4>
          <p class="text-xs text-gray-600 mb-1">${gig.description}</p>
          ${gig.locationName ? `<div class="text-[10px] text-gray-500 mb-1 truncate">📍 ${gig.locationName}</div>` : ''}
          <div class="text-[10px] text-indigo-700 font-semibold mb-1">When: ${scheduleBadge}</div>
          <div class="text-xs font-semibold text-green-600">Budget: ${budgetDisplay}</div>
          <div class="text-[10px] text-indigo-600 font-semibold mt-1">Manage or apply in the map panel below</div>
        </div>
      `);
      marker.on('click', () => {
        if (soundEnabled) playClickSound();
        setActiveMapGigId(gig.id);
      });
      group.addLayer(marker);
    });
  }, [gigs, selectedCountry, currentUserEmail, soundEnabled]);

  // Active gig navigation route renderer on the map
  const activeNavigatingGig = useMemo(() => {
    return gigs.find(
      g =>
        g.status === 'in_progress' &&
        ((g.creatorEmail || '').toLowerCase() === currentUserEmail ||
          (g.applicantEmail || '').toLowerCase() === currentUserEmail)
    ) || null;
  }, [gigs, currentUserEmail]);

  const getDistanceKm = (lat1: number, lng1: number, lat2: number, lng2: number) => {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  useEffect(() => {
    if (!routeLayerRef.current || !mapRef.current) return;
    const group = routeLayerRef.current;
    group.clearLayers();

    if (!activeNavigatingGig) {
      lastNavigatedGigIdRef.current = null;
      return;
    }

    const startLat = userCoordsRef.current?.lat || userProfile.lat || 51.505;
    const startLng = userCoordsRef.current?.lng || userProfile.lng || -0.09;
    const destLat = activeNavigatingGig.lat;
    const destLng = activeNavigatingGig.lng;

    // Slight waypoint offset for clear road-style arc route
    const midLat = (startLat + destLat) / 2 + (destLng - startLng) * 0.08;
    const midLng = (startLng + destLng) / 2 - (destLat - startLat) * 0.08;

    const routeLine = L.polyline(
      [
        [startLat, startLng],
        [midLat, midLng],
        [destLat, destLng]
      ],
      {
        color: '#2563eb',
        weight: 5,
        opacity: 0.9,
        dashArray: '10, 8'
      }
    );
    group.addLayer(routeLine);

    const destBeacon = L.circleMarker([destLat, destLng], {
      radius: 14,
      color: '#4f46e5',
      fillColor: '#6366f1',
      fillOpacity: 0.25,
      weight: 3
    });
    group.addLayer(destBeacon);

    if (lastNavigatedGigIdRef.current !== activeNavigatingGig.id) {
      lastNavigatedGigIdRef.current = activeNavigatingGig.id;
      const bounds = L.latLngBounds([
        [startLat, startLng],
        [destLat, destLng]
      ]);
      mapRef.current.fitBounds(bounds, { padding: [95, 95], maxZoom: 16, animate: true });
    }
  }, [activeNavigatingGig, userProfile.lat, userProfile.lng]);

  // Render Companies on map
  useEffect(() => {
    if (!companiesMarkersRef.current || !mapRef.current) return;
    const group = companiesMarkersRef.current;
    group.clearLayers();

    companies.forEach(comp => {
      const marker = L.marker([comp.lat, comp.lng]);
      marker.bindPopup(`
        <div class="p-2 min-w-[180px]">
          <span class="text-[10px] bg-purple-100 text-purple-700 font-bold px-2 py-0.5 rounded-full">COMPANY</span>
          <h4 class="font-bold text-sm text-gray-900 mt-1">${comp.name}</h4>
          <p class="text-xs text-gray-600 mb-1">${comp.category}</p>
          <p class="text-xs text-gray-400">${comp.address}</p>
        </div>
      `);
      group.addLayer(marker);
    });
  }, [companies]);

  // Live Autocomplete Suggestions as user types
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}`);
        const data = await res.json();
        setSearchResults(data);
      } catch (err) {
        console.error('Autocomplete error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Live Autocomplete Suggestions for Create Gig Location
  useEffect(() => {
    if (gigLocationJustPickedRef.current) {
      gigLocationJustPickedRef.current = false;
      return;
    }
    if (!createGigModal || !gigLocationQuery.trim() || gigLocationQuery.trim().length < 2) {
      setGigLocationResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearchingGigLocation(true);
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(gigLocationQuery)}`);
        const data = await res.json();
        setGigLocationResults(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Gig location autocomplete error:', err);
      } finally {
        setIsSearchingGigLocation(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [gigLocationQuery, createGigModal]);

  // Live Autocomplete Suggestions for Edit Gig Location
  useEffect(() => {
    if (editGigLocationJustPickedRef.current) {
      editGigLocationJustPickedRef.current = false;
      return;
    }
    if (!editingGig || !editGigLocationQuery.trim() || editGigLocationQuery.trim().length < 2) {
      setEditGigLocationResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearchingEditGigLocation(true);
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(editGigLocationQuery)}`);
        const data = await res.json();
        setEditGigLocationResults(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Edit gig location autocomplete error:', err);
      } finally {
        setIsSearchingEditGigLocation(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [editGigLocationQuery, editingGig]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (soundEnabled) playClickSound();
    if (searchResults.length > 0) {
      selectLocation(searchResults[0]);
    }
  };

  const selectLocation = (item: SearchResult) => {
    if (soundEnabled) playClickSound();
    const lat = parseFloat(item.lat);
    const lon = parseFloat(item.lon);
    if (mapRef.current) {
      mapRef.current.setView([lat, lon], 15);
      if (searchMarkerRef.current) {
        mapRef.current.removeLayer(searchMarkerRef.current);
      }
      const marker = L.marker([lat, lon])
        .addTo(mapRef.current)
        .bindPopup(`<b>${item.display_name}</b>`)
        .openPopup();
      searchMarkerRef.current = marker;
    }
    setSearchResults([]);
    setSearchQuery(item.display_name.split(',')[0]);
  };

  // Direct user back to their location on the map
  const handleLocateMe = () => {
    if (soundEnabled) playClickSound();
    const targetLat = userCoordsRef.current?.lat || userProfile.lat || 51.505;
    const targetLng = userCoordsRef.current?.lng || userProfile.lng || -0.09;
    if (mapRef.current) {
      mapRef.current.flyTo([targetLat, targetLng], Math.max(mapRef.current.getZoom(), 16), {
        animate: true,
        duration: 0.65
      });
      if (userMarkerRef.current) {
        userMarkerRef.current.setLatLng([targetLat, targetLng]);
        userMarkerRef.current.openPopup();
      }
    }
    if (navigator.geolocation) {
      setIsLocatingMap(true);
      navigator.geolocation.getCurrentPosition(
        pos => {
          const { latitude, longitude, accuracy } = pos.coords;
          userCoordsRef.current = { lat: latitude, lng: longitude };
          if (mapRef.current) {
            mapRef.current.flyTo([latitude, longitude], 16, { animate: true, duration: 0.65 });
          }
          if (userMarkerRef.current) {
            userMarkerRef.current.setLatLng([latitude, longitude]);
            userMarkerRef.current.openPopup();
          }
          if (userAccuracyCircleRef.current) {
            userAccuracyCircleRef.current.setLatLng([latitude, longitude]);
            userAccuracyCircleRef.current.setRadius(accuracy || 25);
          }
          setIsLocatingMap(false);
        },
        () => {
          setIsLocatingMap(false);
        },
        { enableHighAccuracy: true, timeout: 6000, maximumAge: 15000 }
      );
    }
  };

  // Zoom controls
  const handleZoomIn = () => {
    if (soundEnabled) playClickSound();
    if (mapRef.current) {
      mapRef.current.zoomIn();
    }
  };

  const handleZoomOut = () => {
    if (soundEnabled) playClickSound();
    if (mapRef.current) {
      mapRef.current.zoomOut();
    }
  };

  // Auth submission with localStorage user remember & login check
  const handleAuthSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (soundEnabled) playClickSound();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !password) return;

    try {
      const registeredUsersStr = localStorage.getItem('geo_osm_registered_users');
      const users: Record<string, string> = registeredUsersStr ? JSON.parse(registeredUsersStr) : {};

      if (authMode === 'signup') {
        if (users[cleanEmail]) {
          setAuthError('An account with this email already exists. Please sign in.');
          setAuthMode('signin');
          return;
        }
        users[cleanEmail] = password;
        localStorage.setItem('geo_osm_registered_users', JSON.stringify(users));
        setUserLoggedIn(cleanEmail);

        // Grant automatic 30-day free trial for any referral joining via code/link
        const cleanRefCode = referralCodeInput.trim();
        if (cleanRefCode) {
          const trialEndsMs = Date.now() + 30 * 86400000;
          setReferralTrialEndsAt(trialEndsMs);
          localStorage.setItem('geo_osm_referral_trial_ends', String(trialEndsMs));
          const joinedStr = new Date().toISOString().split('T')[0];
          const endsStr = new Date(trialEndsMs).toISOString().split('T')[0];
          const newRef: ReferralItem = {
            id: 'r' + Date.now(),
            username: cleanEmail,
            joinedDate: joinedStr,
            tenantCode: cleanRefCode,
            countryCode: selectedCountry.code,
            countryName: selectedCountry.country,
            countryFlag: selectedCountry.flag,
            status: 'Approved',
            commissionEarned: formatCurrency(0, selectedCountry),
            commissionUsd: 0,
            activitiesCount: 0,
            lastActive: 'Just now',
            trialDays: 30,
            trialEndsDate: endsStr
          };
          setReferrals(prev => [newRef, ...prev]);
        }

        setAuthModalOpen(false);
        setEmail('');
        setPassword('');
        setReferralCodeInput('');
        setAuthError(null);
        // Ask user which country after successful signup (only if not yet chosen & locked)
        if (!countryLocked) {
          setCountryModalOpen(true);
        }
      } else {
        if (users[cleanEmail] && users[cleanEmail] === password) {
          setUserLoggedIn(cleanEmail);
          setAuthModalOpen(false);
          setEmail('');
          setPassword('');
          setAuthError(null);
          if (!countryLocked && !localStorage.getItem('geo_osm_country_locked')) {
            setCountryModalOpen(true);
          }
        } else if (users[cleanEmail]) {
          setAuthError('Incorrect password');
        } else {
          setAuthError('Account not found. Please sign up first.');
          setAuthMode('signup');
        }
      }
    } catch (err) {
      setUserLoggedIn(cleanEmail);
      setAuthModalOpen(false);
      if (authMode === 'signup' && !countryLocked) {
        setCountryModalOpen(true);
      }
    }
  };

  const handleGoogleSignIn = () => {
    if (soundEnabled) playClickSound();
    setUserLoggedIn('user@google.com');
    setAuthModalOpen(false);
    setAuthError(null);
    if (!countryLocked && !localStorage.getItem('geo_osm_country_locked')) {
      setCountryModalOpen(true);
    }
  };

  // Create Gig & show immediately on map with sound + congratulations
  const handleCreateGigSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!gigTitle.trim() || !mapRef.current) return;
    const center = mapRef.current.getCenter();
    const lat = gigSelectedCoords ? gigSelectedCoords.lat : center.lat + (Math.random() - 0.5) * 0.003;
    const lng = gigSelectedCoords ? gigSelectedCoords.lng : center.lng + (Math.random() - 0.5) * 0.003;

    const rawBudget = gigBudget.trim();
    const numericInput = parseUsdFromString(rawBudget);
    const budgetUsd = numericInput > 0 ? numericInput / selectedCountry.rateFromUsd : 500;
    const formattedBudget = rawBudget
      ? `${selectedCountry.symbol}${numericInput.toLocaleString('en-US')}`
      : formatCurrency(500, selectedCountry, 0);

    const newGig: GigItem = {
      id: Date.now().toString(),
      title: gigTitle,
      description: gigDesc,
      locationName: gigLocationQuery.trim() || undefined,
      lat,
      lng,
      budget: formattedBudget,
      budgetUsd,
      scheduleType: gigScheduleType,
      scheduledDate: gigScheduleType === 'scheduled' ? gigScheduledDate : undefined,
      scheduledTime: gigScheduleType === 'scheduled' ? gigScheduledTime : undefined,
      creatorEmail: currentUserEmail,
      creatorName: currentUserName,
      status: 'open'
    };
    prevGigsLengthRef.current += 1;
    setGigs(prev => [...prev, newGig]);
    if (soundEnabled) playNewListingSound();
    setCreateGigModal(false);
    setGigTitle('');
    setGigDesc('');
    setGigBudget('');
    setGigScheduleType('immediate');
    setGigScheduledDate('');
    setGigScheduledTime('');
    setGigLocationQuery('');
    setGigLocationResults([]);
    setGigSelectedCoords(null);
    setActiveMapGigId(newGig.id);
    setGigCongratsModal(newGig);

    // Pan smoothly to newly created gig on map (rendered via gigsMarkersRef)
    if (mapRef.current) {
      mapRef.current.setView([lat, lng], 16, { animate: true });
    }
  };

  // Gig Actions: Edit, Delete, Apply, Owner Accept/Decline, Owner Complete & Rate
  const handleOpenEditGig = (gig: GigItem) => {
    if (soundEnabled) playClickSound();
    if ((gig.creatorEmail || '').toLowerCase() !== currentUserEmail) return;
    setEditingGig(gig);
    setEditGigTitle(gig.title);
    setEditGigDesc(gig.description);
    setEditGigScheduleType(gig.scheduleType || 'immediate');
    setEditGigScheduledDate(gig.scheduledDate || '');
    setEditGigScheduledTime(gig.scheduledTime || '');
    editGigLocationJustPickedRef.current = true;
    setEditGigLocationQuery(gig.locationName || '');
    setEditGigLocationResults([]);
    setEditGigSelectedCoords({ lat: gig.lat, lng: gig.lng });
    const localVal = gig.budgetUsd !== undefined
      ? Math.round(gig.budgetUsd * selectedCountry.rateFromUsd).toString()
      : parseUsdFromString(gig.budget).toString();
    setEditGigBudget(localVal);
  };

  const handleSaveEditGig = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGig || !editGigTitle.trim()) return;
    if (soundEnabled) playClickSound();
    const numericInput = parseUsdFromString(editGigBudget.trim());
    const budgetUsd = numericInput > 0 ? numericInput / selectedCountry.rateFromUsd : editingGig.budgetUsd || 500;
    const formattedBudget = `${selectedCountry.symbol}${numericInput.toLocaleString('en-US')}`;
    const updatedLat = editGigSelectedCoords ? editGigSelectedCoords.lat : editingGig.lat;
    const updatedLng = editGigSelectedCoords ? editGigSelectedCoords.lng : editingGig.lng;

    setGigs(prev =>
      prev.map(g =>
        g.id === editingGig.id
          ? {
              ...g,
              title: editGigTitle.trim(),
              description: editGigDesc.trim(),
              locationName: editGigLocationQuery.trim() || g.locationName,
              lat: updatedLat,
              lng: updatedLng,
              budget: formattedBudget,
              budgetUsd,
              scheduleType: editGigScheduleType,
              scheduledDate: editGigScheduleType === 'scheduled' ? editGigScheduledDate : undefined,
              scheduledTime: editGigScheduleType === 'scheduled' ? editGigScheduledTime : undefined
            }
          : g
      )
    );
    if (mapRef.current && editGigSelectedCoords) {
      mapRef.current.setView([updatedLat, updatedLng], 16, { animate: true });
    }
    setEditingGig(null);
    setGigNoticeBanner('Gig post updated on map.');
    setTimeout(() => setGigNoticeBanner(null), 2500);
  };

  const handleDeleteGig = (gig: GigItem) => {
    if (soundEnabled) playClickSound();
    if ((gig.creatorEmail || '').toLowerCase() !== currentUserEmail) return;
    setGigs(prev => prev.filter(g => g.id !== gig.id));
    if (activeMapGigId === gig.id) setActiveMapGigId(null);
    setGigNoticeBanner('Gig post deleted from map.');
    setTimeout(() => setGigNoticeBanner(null), 2500);
  };

  const handleApplyToGig = (gig: GigItem) => {
    if (soundEnabled) playClickSound();
    if (tenantSubActive) return; // Tenants are not allowed to apply for gigs
    if ((gig.creatorEmail || '').toLowerCase() === currentUserEmail) return;
    if (gig.status && gig.status !== 'open') return;

    const now = Date.now();
    notifiedTimeoutGigIdsRef.current.delete(gig.id);
    setGigWaitNowMs(now);
    setGigs(prev =>
      prev.map(g =>
        g.id === gig.id
          ? {
              ...g,
              status: 'pending_acceptance',
              applicantEmail: currentUserEmail,
              applicantName: currentUserName,
              appliedAt: now
            }
          : g
      )
    );
  };

  const handleCancelGigApplication = (gig: GigItem) => {
    if (soundEnabled) playClickSound();
    notifiedTimeoutGigIdsRef.current.delete(gig.id);
    setGigs(prev =>
      prev.map(g =>
        g.id === gig.id
          ? {
              ...g,
              status: 'open',
              applicantEmail: undefined,
              applicantName: undefined,
              appliedAt: undefined
            }
          : g
      )
    );
    setGigNoticeBanner('Application cancelled. You can apply for another gig.');
    setTimeout(() => setGigNoticeBanner(null), 3000);
  };

  const handleAcceptApplicant = (gig: GigItem) => {
    if (soundEnabled) playClickSound();
    if ((gig.creatorEmail || '').toLowerCase() !== currentUserEmail) return;
    notifiedTimeoutGigIdsRef.current.delete(gig.id);
    setGigs(prev =>
      prev.map(g => (g.id === gig.id ? { ...g, status: 'in_progress', appliedAt: undefined } : g))
    );
    setCurrentView('map');
    setActiveMapGigId(gig.id);
    setGigNoticeBanner(`Accepted ${gig.applicantName || 'applicant'} — navigating to gig destination.`);
    setTimeout(() => setGigNoticeBanner(null), 3500);
  };

  const handleDeclineApplicant = (gig: GigItem) => {
    if (soundEnabled) playClickSound();
    if ((gig.creatorEmail || '').toLowerCase() !== currentUserEmail) return;
    notifiedTimeoutGigIdsRef.current.delete(gig.id);
    setGigs(prev =>
      prev.map(g =>
        g.id === gig.id
          ? { ...g, status: 'open', applicantEmail: undefined, applicantName: undefined, appliedAt: undefined }
          : g
      )
    );
  };

  const handleOpenCompleteGigModal = (gig: GigItem) => {
    if (soundEnabled) playClickSound();
    // Only gig owner can mark gig completed and give star rating
    if ((gig.creatorEmail || '').toLowerCase() !== currentUserEmail) return;
    setCompletingGig(gig);
    setRatingStars(5);
    setRatingComment('');
  };

  const handleSubmitGigCompletionRating = (e: React.FormEvent) => {
    e.preventDefault();
    if (!completingGig) return;
    if ((completingGig.creatorEmail || '').toLowerCase() !== currentUserEmail) return;
    if (soundEnabled) playClickSound();

    const targetEmail = (completingGig.applicantEmail || currentUserEmail).toLowerCase();
    const newRating: GigRating = {
      id: `rate-${Date.now()}`,
      gigId: completingGig.id,
      gigTitle: completingGig.title,
      rating: ratingStars,
      comment: ratingComment.trim() || undefined,
      ratedBy: currentUserName,
      ratedAt: new Date().toISOString().split('T')[0]
    };

    setGigs(prev =>
      prev.map(g =>
        g.id === completingGig.id
          ? { ...g, status: 'completed', rating: ratingStars }
          : g
      )
    );

    setUserRatingsMap(prev => {
      const existing = prev[targetEmail] || [];
      return {
        ...prev,
        [targetEmail]: [newRating, ...existing]
      };
    });

    if (targetEmail === currentUserEmail || targetEmail === (userProfile.email || '').toLowerCase()) {
      setUserProfile(prev => ({
        ...prev,
        ratings: [newRating, ...(prev.ratings || [])]
      }));
    }

    setCompletingGig(null);
    setGigNoticeBanner(`Gig completed & ${ratingStars}-star rating saved to user Profile!`);
    setTimeout(() => setGigNoticeBanner(null), 3500);
  };

  // Add Company & show immediately on map
  const handleAddCompanySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (soundEnabled) playClickSound();
    if (!companyName.trim() || !mapRef.current) return;
    const center = mapRef.current.getCenter();
    const lat = center.lat + (Math.random() - 0.5) * 0.003;
    const lng = center.lng + (Math.random() - 0.5) * 0.003;

    const newComp: CompanyItem = {
      id: Date.now().toString(),
      name: companyName,
      category: companyCategory,
      lat,
      lng,
      address: companyAddress || 'Map Location'
    };
    setCompanies(prev => [...prev, newComp]);
    setAddCompanyModal(false);
    setCompanyName('');
    setCompanyAddress('');

    // Show location immediately on map
    if (mapRef.current) {
      mapRef.current.setView([lat, lng], 16);
      const marker = L.marker([lat, lng])
        .addTo(mapRef.current)
        .bindPopup(`
          <div class="p-2 min-w-[180px]">
            <span class="text-[10px] bg-purple-100 text-purple-700 font-bold px-2 py-0.5 rounded-full">NEW COMPANY</span>
            <h4 class="font-bold text-sm text-gray-900 mt-1">${newComp.name}</h4>
            <p class="text-xs text-gray-600 mb-1">${newComp.category}</p>
            <p class="text-xs text-gray-400">${newComp.address}</p>
          </div>
        `)
        .openPopup();
      searchMarkerRef.current = marker;
    }
  };

  // Stop media stream tracks cleanly
  const stopMediaStream = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(t => t.stop());
      mediaStreamRef.current = null;
    }
    setWebcamActive(false);
  };

  // Start webcam for live selfie capture with permission request
  const startWebcam = async () => {
    setCameraPermissionError(null);
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraPermissionError('Direct webcam is unavailable in this environment. Please tap "Device Camera" below to take a selfie directly.');
      return;
    }
    try {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
          audio: false
        });
      } catch (innerErr) {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      }

      mediaStreamRef.current = stream;
      setWebcamActive(true);
      if (webcamRef.current) {
        webcamRef.current.srcObject = stream;
        try {
          await webcamRef.current.play();
        } catch (playErr) {
          console.log('Video play error:', playErr);
        }
      }
    } catch (e: any) {
      console.log('Camera permission error:', e);
      if (e.name === 'NotAllowedError' || e.name === 'PermissionDeniedError') {
        setCameraPermissionError('Camera access permission was denied or blocked. Tap "Device Camera" below to take a selfie directly with your device camera, or allow camera permissions in browser settings.');
      } else if (e.name === 'NotFoundError' || e.name === 'DevicesNotFoundError') {
        setCameraPermissionError('No camera found on this device. Please tap "Upload Photo" below.');
      } else {
        setCameraPermissionError('Camera is currently unavailable (' + (e.message || e.name || 'error') + '). Please tap "Device Camera" below to take your selfie.');
      }
      setWebcamActive(false);
    }
  };

  // Capture photo from live video canvas
  const captureSelfie = () => {
    if (webcamRef.current && webcamRef.current.videoWidth) {
      const canvas = document.createElement('canvas');
      canvas.width = webcamRef.current.videoWidth || 640;
      canvas.height = webcamRef.current.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(webcamRef.current, 0, 0, canvas.width, canvas.height);
        setSelfieImage(canvas.toDataURL('image/jpeg', 0.85));
      }
    } else {
      setCameraPermissionError('No active webcam video frame captured. Please upload a photo instead.');
    }
    stopMediaStream();
  };

  // Handle uploaded selfie or file capture
  const handleSelfieFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) {
          setSelfieImage(ev.target.result as string);
          stopMediaStream();
          setCameraPermissionError(null);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Referrals moderation handlers (Approve, Reject, Freeze, Unfreeze)
  const handleApproveReferral = (id: string) => {
    if (soundEnabled) playClickSound();
    setReferrals(prev => prev.map(r => r.id === id ? { ...r, status: 'Approved', freezeReason: undefined } : r));
    if (selectedReferralForView && selectedReferralForView.id === id) {
      setSelectedReferralForView(prev => prev ? { ...prev, status: 'Approved', freezeReason: undefined } : null);
    }
  };

  const handleRejectReferral = (id: string) => {
    if (soundEnabled) playClickSound();
    setReferrals(prev => prev.map(r => r.id === id ? { ...r, status: 'Rejected' } : r));
    if (selectedReferralForView && selectedReferralForView.id === id) {
      setSelectedReferralForView(prev => prev ? { ...prev, status: 'Rejected' } : null);
    }
  };

  const handleOpenFreezeModal = (ref: ReferralItem) => {
    if (soundEnabled) playClickSound();
    setReferralToFreeze(ref);
    setFreezeReasonInput('Rule Violation: Failed to adhere to safety protocols or community terms.');
    setFreezeModalOpen(true);
  };

  const handleConfirmFreeze = () => {
    if (soundEnabled) playClickSound();
    if (!referralToFreeze) return;
    setReferrals(prev => prev.map(r => r.id === referralToFreeze.id ? {
      ...r,
      status: 'Frozen',
      freezeReason: freezeReasonInput || 'Account frozen for rule violations.'
    } : r));
    if (selectedReferralForView && selectedReferralForView.id === referralToFreeze.id) {
      setSelectedReferralForView(prev => prev ? {
        ...prev,
        status: 'Frozen',
        freezeReason: freezeReasonInput || 'Account frozen for rule violations.'
      } : null);
    }
    setFreezeModalOpen(false);
    setReferralToFreeze(null);
  };

  const handleUnfreezeReferral = (id: string) => {
    if (soundEnabled) playClickSound();
    setReferrals(prev => prev.map(r => r.id === id ? { ...r, status: 'Approved', freezeReason: undefined } : r));
    if (selectedReferralForView && selectedReferralForView.id === id) {
      setSelectedReferralForView(prev => prev ? { ...prev, status: 'Approved', freezeReason: undefined } : null);
    }
  };

  // Set location automatically from GPS or Map Center for Profile
  const handleSetLocationAutomatically = async () => {
    if (soundEnabled) playClickSound();
    setIsLocatingProfile(true);
    try {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (pos) => {
            const { latitude, longitude } = pos.coords;
            userCoordsRef.current = { lat: latitude, lng: longitude };
            if (mapRef.current) {
              mapRef.current.setView([latitude, longitude], 16, { animate: true });
            }
            let locName = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
            try {
              const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
              const data = await res.json();
              if (data && data.display_name) {
                locName = data.display_name.split(',').slice(0, 3).join(', ');
              }
            } catch (e) {}

            setUserProfile(prev => ({
              ...prev,
              location: locName,
              lat: latitude,
              lng: longitude,
              autoLocation: true
            }));

            // Sync user marker on map immediately
            if (mapRef.current) {
              const currentSelfie = userProfile.selfieImage || selfieImage || null;
              const userIcon = getUserMarkerIcon(currentSelfie);
              if (userMarkerRef.current) {
                userMarkerRef.current.setLatLng([latitude, longitude]);
                userMarkerRef.current.setIcon(userIcon);
              } else {
                userMarkerRef.current = L.marker([latitude, longitude], { icon: userIcon }).addTo(mapRef.current);
              }
            }

            setIsLocatingProfile(false);
            setProfileSavedToast(true);
            setTimeout(() => setProfileSavedToast(false), 2500);
          },
          async () => {
            if (mapRef.current) {
              const center = mapRef.current.getCenter();
              userCoordsRef.current = { lat: center.lat, lng: center.lng };
              let locName = `${center.lat.toFixed(4)}, ${center.lng.toFixed(4)} (Map Center)`;
              try {
                const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${center.lat}&lon=${center.lng}`);
                const data = await res.json();
                if (data && data.display_name) {
                  locName = data.display_name.split(',').slice(0, 3).join(', ');
                }
              } catch (e) {}

              setUserProfile(prev => ({
                ...prev,
                location: locName,
                lat: center.lat,
                lng: center.lng,
                autoLocation: true
              }));

              const currentSelfie = userProfile.selfieImage || selfieImage || null;
              const userIcon = getUserMarkerIcon(currentSelfie);
              if (userMarkerRef.current) {
                userMarkerRef.current.setLatLng([center.lat, center.lng]);
                userMarkerRef.current.setIcon(userIcon);
              } else {
                userMarkerRef.current = L.marker([center.lat, center.lng], { icon: userIcon }).addTo(mapRef.current);
              }
            }
            setIsLocatingProfile(false);
            setProfileSavedToast(true);
            setTimeout(() => setProfileSavedToast(false), 2500);
          },
          { enableHighAccuracy: true, timeout: 5000, maximumAge: 60000 }
        );
      } else if (mapRef.current) {
        const center = mapRef.current.getCenter();
        setUserProfile(prev => ({
          ...prev,
          location: `${center.lat.toFixed(4)}, ${center.lng.toFixed(4)} (Map Center)`,
          lat: center.lat,
          lng: center.lng,
          autoLocation: true
        }));
        setIsLocatingProfile(false);
      }
    } catch (err) {
      setIsLocatingProfile(false);
    }
  };

  // Stop profile camera media stream
  const stopProfileMediaStream = () => {
    if (profileMediaStreamRef.current) {
      profileMediaStreamRef.current.getTracks().forEach(track => track.stop());
      profileMediaStreamRef.current = null;
    }
    setProfileWebcamActive(false);
  };

  useEffect(() => {
    if (!profileModalOpen) {
      stopProfileMediaStream();
    }
  }, [profileModalOpen]);

  // Start live webcam for profile selfie
  const startProfileWebcam = async () => {
    setProfileCameraError(null);
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setProfileCameraError('Live webcam is not directly supported in this browser. Please use "Device Camera" or "Upload Photo" below.');
      return;
    }
    try {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
          audio: false
        });
      } catch (innerErr) {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      }
      profileMediaStreamRef.current = stream;
      setProfileWebcamActive(true);
      if (profileWebcamRef.current) {
        profileWebcamRef.current.srcObject = stream;
        try {
          await profileWebcamRef.current.play();
        } catch (playErr) {}
      }
    } catch (e: any) {
      setProfileCameraError('Camera access was denied or is unavailable. Please use "Device Camera" below to take a selfie directly.');
      setProfileWebcamActive(false);
    }
  };

  // Capture photo from profile live webcam canvas
  const captureProfileSelfie = () => {
    if (profileWebcamRef.current && profileWebcamRef.current.videoWidth) {
      const canvas = document.createElement('canvas');
      canvas.width = profileWebcamRef.current.videoWidth || 640;
      canvas.height = profileWebcamRef.current.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(profileWebcamRef.current, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        setUserProfile(prev => ({ ...prev, selfieImage: dataUrl }));
        setSelfieImage(dataUrl);
      }
    }
    stopProfileMediaStream();
  };

  // Handle uploaded selfie or mobile device camera file
  const handleProfileSelfieFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) {
          const imgUrl = ev.target.result as string;
          setUserProfile(prev => ({ ...prev, selfieImage: imgUrl }));
          setSelfieImage(imgUrl);
          stopProfileMediaStream();
          setProfileCameraError(null);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Social link helpers
  const handleAddSocialLink = () => {
    if (soundEnabled) playClickSound();
    setUserProfile(prev => ({
      ...prev,
      socialLinks: [
        ...prev.socialLinks,
        { id: Date.now().toString(), platform: 'Twitter / X', url: '' }
      ]
    }));
  };

  const handleUpdateSocialLink = (id: string, field: 'platform' | 'url', value: string) => {
    setUserProfile(prev => ({
      ...prev,
      socialLinks: prev.socialLinks.map(link => link.id === id ? { ...link, [field]: value } : link)
    }));
  };

  const handleRemoveSocialLink = (id: string) => {
    if (soundEnabled) playClickSound();
    setUserProfile(prev => ({
      ...prev,
      socialLinks: prev.socialLinks.filter(link => link.id !== id)
    }));
  };

  // Save profile and sync with live map
  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (soundEnabled) playClickSound();
    localStorage.setItem('geo_osm_user_profile', JSON.stringify(userProfile));

    const currentSelfie = userProfile.selfieImage || selfieImage || null;
    if (userMarkerRef.current) {
      userMarkerRef.current.setIcon(getUserMarkerIcon(currentSelfie));
      userMarkerRef.current.setPopupContent(`
        <div class="p-2 min-w-[160px] text-center">
          ${currentSelfie ? `<img src="${currentSelfie}" class="w-12 h-12 rounded-full mx-auto object-cover border-2 border-blue-600 mb-1.5 shadow-md" />` : ''}
          <h4 class="font-bold text-sm text-gray-900">${userProfile.name || 'Your'} ${userProfile.surname || 'Location'}</h4>
          <p class="text-[11px] text-blue-600 font-semibold mt-0.5">Your Location on Map</p>
        </div>
      `);
      if (userProfile.lat && userProfile.lng && mapRef.current) {
        userMarkerRef.current.setLatLng([userProfile.lat, userProfile.lng]);
        mapRef.current.setView([userProfile.lat, userProfile.lng], 15, { animate: true });
      }
    }

    // If user entered a Seeker skill in profile, register/update real Seeker entry with sound
    if (registerSeekerSkill.trim()) {
      const rateNum = parseUsdFromString(registerSeekerRate) || 35;
      const rateUsd = rateNum / (selectedCountry.rateFromUsd || 1);
      const formattedRate = formatCurrency(rateUsd, selectedCountry, 0) + '/hr';
      const seekerName = `${userProfile.name} ${userProfile.surname}`.trim() || currentUserName;
      const seekerLat = userProfile.lat || userCoordsRef.current?.lat || 51.505;
      const seekerLng = userProfile.lng || userCoordsRef.current?.lng || -0.09;
      setSeekers(prev => {
        const existingIdx = prev.findIndex(s => s.id === `seeker-${currentUserEmail || 'self'}`);
        const newSeeker: SeekerItem = {
          id: `seeker-${currentUserEmail || 'self'}`,
          name: seekerName,
          skill: registerSeekerSkill.trim(),
          rate: formattedRate,
          rateUsd,
          rating: 5.0,
          lat: seekerLat,
          lng: seekerLng,
          status: 'Ready to Hire'
        };
        if (existingIdx >= 0) {
          const updated = [...prev];
          updated[existingIdx] = newSeeker;
          return updated;
        }
        return [newSeeker, ...prev];
      });
    }

    setProfileSavedToast(true);
    setTimeout(() => {
      setProfileSavedToast(false);
      setProfileModalOpen(false);
    }, 1200);
  };

  return (
    <div className="w-screen h-screen overflow-hidden relative font-sans">
      {/* Leaflet Map Container Filling Entire Screen without Cutoff or Darkening in 3D / Street View */}
      <div
        className={`absolute inset-0 z-0 overflow-hidden bg-[#e5e9ef] ${
          currentView !== 'map' ? 'hidden' : ''
        }`}
        style={{
          perspective: is3DMode || isStreetViewNav ? '1800px' : 'none',
          perspectiveOrigin: '50% 50%'
        }}
      >
        <div
          className="w-full h-full transition-transform duration-500 ease-out will-change-transform"
          style={{
            transform: isStreetViewNav
              ? 'rotateX(36deg) scale(1.68)'
              : is3DMode
              ? 'rotateX(28deg) scale(1.62)'
              : 'rotateX(0deg) scale(1)',
            transformOrigin: '50% 50%'
          }}
        >
          <div
            ref={mapContainerRef}
            className="w-full h-full"
          />
        </div>
      </div>

      {/* Floating 3D Mode Indicator Badge when active */}
      {is3DMode && currentView === 'map' && (
        <div className="absolute top-20 right-6 z-[9999] pointer-events-auto bg-black/80 backdrop-blur-md text-white text-[11px] font-bold px-3.5 py-1.5 rounded-full shadow-2xl border border-white/20 flex items-center space-x-2 animate-in fade-in duration-200 overflow-hidden">
          <FloatingToolsBackdrop compact count={4} />
          <Box className="w-3.5 h-3.5 text-indigo-400 animate-pulse relative z-10" />
          <span className="relative z-10">3D Perspective (Full Map)</span>
          <button
            onClick={() => {
              if (soundEnabled) playClickSound();
              setIs3DMode(false);
            }}
            aria-label="Back to 2D"
            title="Back to 2D"
            className="ml-1 text-gray-300 hover:text-white relative z-10 p-0.5 rounded-full hover:bg-white/10 transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Top Search Bar (Always Visible on Top of Map) with Floating Tools */}
      {currentView === 'map' && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-[9999] w-[92%] max-w-lg pointer-events-auto">
          <form onSubmit={handleSearchSubmit} className="relative flex items-center shadow-2xl rounded-2xl bg-white/95 backdrop-blur-md border-2 border-gray-300 overflow-hidden">
            <FloatingToolsBackdrop compact count={6} />
            <Search className="absolute left-4 w-5 h-5 text-gray-600 z-10" />
            <input
              type="text"
              placeholder="Search area, street, location, province..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="relative z-10 w-full pl-12 pr-12 py-3.5 bg-transparent text-sm text-gray-900 font-medium focus:outline-none placeholder-gray-400"
            />
            {isSearching && (
              <Loader2 className="absolute right-4 w-5 h-5 text-blue-600 animate-spin z-10" />
            )}
          </form>

          {/* Live Autocomplete Suggestions Dropdown */}
          {searchResults.length > 0 && (
            <div className="mt-2 max-h-60 overflow-y-auto bg-white border-2 border-gray-300 rounded-2xl shadow-2xl divide-y divide-gray-100">
              {searchResults.map(item => (
                <button
                  key={item.place_id}
                  type="button"
                  onClick={() => selectLocation(item)}
                  className="w-full text-left px-4 py-3 text-xs text-gray-800 font-medium hover:bg-blue-50 flex items-center space-x-2.5 transition"
                >
                  <MapPin className="w-4 h-4 text-blue-600 shrink-0" />
                  <span className="truncate">{item.display_name}</span>
                </button>
              ))}
            </div>
          )}

          {/* Toast Notice Banner */}
          {gigNoticeBanner && (
            <div className="mt-2 px-4 py-2.5 bg-emerald-600 text-white rounded-2xl shadow-xl text-xs font-bold flex items-center justify-between animate-in fade-in duration-200">
              <span>{gigNoticeBanner}</span>
              <button
                type="button"
                onClick={() => setGigNoticeBanner(null)}
                className="p-1 hover:bg-white/20 rounded-lg"
                aria-label="Back"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Applicant 60-Second No-Response Alert Banner */}
          {(() => {
            const unresponsiveGig = gigs.find(
              g =>
                g.status === 'pending_acceptance' &&
                Boolean(currentUserEmail) &&
                (g.applicantEmail || '').toLowerCase() === currentUserEmail &&
                Boolean(g.appliedAt) &&
                gigWaitNowMs - (g.appliedAt || 0) > 60000
            );
            if (!unresponsiveGig) return null;
            return (
              <div className="mt-2 p-3 bg-amber-50/95 backdrop-blur-md border-2 border-amber-400 rounded-2xl shadow-2xl flex items-center justify-between gap-2 animate-in fade-in duration-200">
                <div className="flex items-start space-x-2 min-w-0">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-xs font-extrabold text-amber-950 truncate">
                      Gig owner hasn&apos;t responded (60s+)
                    </p>
                    <p className="text-[11px] text-amber-800 truncate">
                      No response yet for &quot;{unresponsiveGig.title}&quot;.
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      if (soundEnabled) playClickSound();
                      setActiveMapGigId(unresponsiveGig.id);
                      if (mapRef.current) {
                        mapRef.current.setView([unresponsiveGig.lat, unresponsiveGig.lng], 15);
                      }
                    }}
                    className="px-2.5 py-1.5 bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-xl text-[11px] font-bold transition"
                  >
                    View
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCancelGigApplication(unresponsiveGig)}
                    className="px-2.5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-[11px] font-bold transition shadow-xs"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            );
          })()}

          {/* Gig Owner Incoming Application Request Banner */}
          {(() => {
            const incomingReqGig = gigs.find(
              g =>
                g.status === 'pending_acceptance' &&
                (g.creatorEmail || '').toLowerCase() === currentUserEmail
            );
            if (!incomingReqGig) return null;
            return (
              <div className="mt-2 p-3 bg-white/95 backdrop-blur-md border-2 border-amber-400 rounded-2xl shadow-2xl flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <span className="text-[9px] font-black uppercase tracking-wider bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                    New Gig Application
                  </span>
                  <p className="text-xs font-bold text-gray-900 truncate mt-1">
                    {incomingReqGig.applicantName || incomingReqGig.applicantEmail} applied to "{incomingReqGig.title}"
                  </p>
                </div>
                <div className="flex items-center space-x-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleAcceptApplicant(incomingReqGig)}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition"
                  >
                    Accept
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeclineApplicant(incomingReqGig)}
                    className="px-2.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-xl text-xs font-bold transition"
                  >
                    Decline
                  </button>
                </div>
              </div>
            );
          })()}

          {/* Active Map Route Navigation HUD */}
          {activeNavigatingGig && (() => {
            const startLat = userCoordsRef.current?.lat || userProfile.lat || 51.505;
            const startLng = userCoordsRef.current?.lng || userProfile.lng || -0.09;
            const distKm = getDistanceKm(startLat, startLng, activeNavigatingGig.lat, activeNavigatingGig.lng);
            const distLabel = distKm < 1 ? `${Math.max(50, Math.round(distKm * 1000))} m` : `${distKm.toFixed(1)} km`;
            const etaMins = Math.max(2, Math.round(distKm * 4 + 2));
            const isNavGigOwner = (activeNavigatingGig.creatorEmail || '').toLowerCase() === currentUserEmail;

            return (
              <div className="mt-2 p-3 bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-2xl shadow-2xl border border-blue-400/50 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center space-x-2 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                      <Navigation className="w-4 h-4 text-white animate-pulse" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-blue-100">
                        Navigating to Gig Destination
                      </p>
                      <h4 className="text-xs font-black truncate">{activeNavigatingGig.title}</h4>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-xs font-black block">{distLabel}</span>
                    <span className="text-[10px] text-blue-100">~{etaMins} min</span>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-white/20 flex-wrap">
                  <div className="flex items-center space-x-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        if (soundEnabled) playClickSound();
                        setIsStreetViewNav(false);
                        if (mapRef.current) {
                          const bounds = L.latLngBounds([
                            [startLat, startLng],
                            [activeNavigatingGig.lat, activeNavigatingGig.lng]
                          ]);
                          mapRef.current.fitBounds(bounds, { padding: [95, 95], maxZoom: 16, animate: true });
                        }
                      }}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition ${
                        !isStreetViewNav ? 'bg-white text-blue-700 shadow-xs' : 'bg-white/20 hover:bg-white/30 text-white'
                      }`}
                    >
                      Route Map
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (soundEnabled) playClickSound();
                        const nextStreet = !isStreetViewNav;
                        setIsStreetViewNav(nextStreet);
                        if (nextStreet) {
                          setIsSatellite(false);
                          if (mapRef.current) {
                            const midLat = (startLat + activeNavigatingGig.lat) / 2;
                            const midLng = (startLng + activeNavigatingGig.lng) / 2;
                            mapRef.current.setView([midLat, midLng], 18, { animate: true });
                          }
                        } else if (mapRef.current) {
                          const bounds = L.latLngBounds([
                            [startLat, startLng],
                            [activeNavigatingGig.lat, activeNavigatingGig.lng]
                          ]);
                          mapRef.current.fitBounds(bounds, { padding: [95, 95], maxZoom: 16, animate: true });
                        }
                      }}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center space-x-1 transition ${
                        isStreetViewNav ? 'bg-amber-400 text-gray-900 shadow-sm' : 'bg-white/20 hover:bg-white/30 text-white'
                      }`}
                    >
                      <Eye className="w-3 h-3" />
                      <span>Street View</span>
                    </button>
                  </div>
                  {isNavGigOwner ? (
                    <button
                      type="button"
                      onClick={() => {
                        setIsStreetViewNav(false);
                        handleOpenCompleteGigModal(activeNavigatingGig);
                      }}
                      className="px-3 py-1 bg-emerald-500 hover:bg-emerald-400 text-white rounded-lg text-[11px] font-black shadow-md flex items-center space-x-1 transition"
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>Gig Completed</span>
                    </button>
                  ) : (
                    <span className="text-[10px] text-blue-100 font-semibold truncate">
                      Follow route • Owner marks Gig Completed
                    </span>
                  )}
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* Interactive Map Gig Action Card when clicking a Gig Marker */}
      {currentView === 'map' && activeMapGigId && (() => {
        const gig = gigs.find(g => g.id === activeMapGigId);
        if (!gig) return null;
        const isGigOwner = (gig.creatorEmail || '').toLowerCase() === currentUserEmail;
        const budgetDisplay = gig.budgetUsd !== undefined
          ? formatCurrency(gig.budgetUsd, selectedCountry, 0)
          : gig.budget;
        const status = gig.status || 'open';

        return (
          <div className={`fixed ${userLoggedIn ? 'bottom-16 left-4 sm:left-6' : 'bottom-24 left-4 sm:left-6'} z-[9998] w-[310px] sm:w-[340px] bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl border-2 border-indigo-200 p-4 space-y-3 pointer-events-auto animate-in fade-in slide-in-from-bottom-3 duration-200 overflow-hidden`}>
            <FloatingToolsBackdrop compact count={6} />
            <div className="relative z-10 flex items-start justify-between gap-2">
              <div className="flex items-center space-x-2 min-w-0">
                <button
                  type="button"
                  onClick={() => {
                    if (soundEnabled) playClickSound();
                    setActiveMapGigId(null);
                  }}
                  aria-label="Back"
                  title="Back"
                  className="p-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 transition shrink-0"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div className="min-w-0">
                  <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                    status === 'in_progress'
                      ? 'bg-indigo-100 text-indigo-700'
                      : status === 'pending_acceptance'
                      ? 'bg-amber-100 text-amber-800'
                      : status === 'completed'
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-blue-100 text-blue-700'
                  }`}>
                    {status === 'in_progress'
                      ? 'In Progress'
                      : status === 'pending_acceptance'
                      ? 'Pending Owner'
                      : status === 'completed'
                      ? 'Completed'
                      : 'Open Gig'}
                  </span>
                  <h4 className="font-bold text-sm text-gray-900 truncate mt-0.5">{gig.title}</h4>
                </div>
              </div>
              <span className="text-xs font-black text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-xl shrink-0">
                {budgetDisplay}
              </span>
            </div>

            <p className="relative z-10 text-xs text-gray-600 leading-relaxed line-clamp-2">
              {gig.description}
            </p>

            {/* Creator Edit & Delete Controls */}
            {isGigOwner && (
              <div className="relative z-10 flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => handleOpenEditGig(gig)}
                  className="flex-1 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 transition"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  <span>Edit Gig</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteGig(gig)}
                  className="flex-1 py-2 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Gig</span>
                </button>
              </div>
            )}

            {/* Status & Apply / Accept / Complete Workflow */}
            <div className="relative z-10 pt-1 border-t border-gray-100">
              {status === 'open' && !isGigOwner && (
                tenantSubActive ? (
                  <div className="p-2.5 bg-red-50 border border-red-200 rounded-xl flex items-center space-x-2 text-[11px] font-bold text-red-700">
                    <ShieldAlert className="w-4 h-4 shrink-0" />
                    <span>Tenants are not allowed to apply for gigs.</span>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleApplyToGig(gig)}
                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md transition flex items-center justify-center space-x-1.5"
                  >
                    <Briefcase className="w-3.5 h-3.5" />
                    <span>Apply for Gig</span>
                  </button>
                )
              )}

              {status === 'open' && isGigOwner && (
                <p className="text-[11px] text-gray-500 text-center font-medium">
                  Waiting for a user to apply to your gig post.
                </p>
              )}

              {status === 'pending_acceptance' && (
                isGigOwner ? (
                  <div className="space-y-2">
                    <p className="text-[11px] font-bold text-amber-800">
                      Applicant: {gig.applicantName || gig.applicantEmail}
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleAcceptApplicant(gig)}
                        className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
                      >
                        Accept & Navigate
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeclineApplicant(gig)}
                        className="px-3 py-2 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-xl text-xs font-bold transition"
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                ) : (() => {
                  const waitedSeconds = gig.appliedAt
                    ? Math.max(0, Math.floor((gigWaitNowMs - gig.appliedAt) / 1000))
                    : 0;
                  const timedOut = waitedSeconds > 60;
                  return timedOut ? (
                    <div className="p-3 bg-amber-50 border-2 border-amber-300 rounded-2xl space-y-2">
                      <div className="flex items-start space-x-2.5">
                        <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                        <div className="min-w-0">
                          <p className="text-xs font-extrabold text-amber-950">
                            Gig owner did not respond (over 60s)
                          </p>
                          <p className="text-[10px] text-amber-800 mt-0.5">
                            No response after {waitedSeconds}s. You can keep waiting or cancel and pick another gig.
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCancelGigApplication(gig)}
                        className="w-full py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
                      >
                        Cancel Application
                      </button>
                    </div>
                  ) : (
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-2xl flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-full border-3 border-blue-200 border-t-blue-600 animate-spin shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-blue-900">
                          Waiting for Gig Owner... ({waitedSeconds}s)
                        </p>
                        <p className="text-[10px] text-blue-700">
                          You will be directed to map navigation once accepted.
                        </p>
                      </div>
                    </div>
                  );
                })()
              )}

              {status === 'in_progress' && (
                isGigOwner ? (
                  <button
                    type="button"
                    onClick={() => handleOpenCompleteGigModal(gig)}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md flex items-center justify-center space-x-1.5 transition"
                  >
                    <CheckCircle className="w-4 h-4" />
                    <span>Gig Completed & Rate User</span>
                  </button>
                ) : (
                  <div className="p-2.5 bg-indigo-50 border border-indigo-200 rounded-xl text-[11px] text-indigo-800 font-semibold flex items-center space-x-2">
                    <Navigation className="w-4 h-4 text-indigo-600 shrink-0" />
                    <span>Navigating to destination. Only the gig owner can complete & rate.</span>
                  </div>
                )
              )}

              {status === 'completed' && (
                <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs font-bold text-emerald-800">
                  <span className="flex items-center space-x-1">
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                    <span>Gig Completed</span>
                  </span>
                  {gig.rating && (
                    <span className="flex items-center space-x-1 text-amber-600">
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                      <span>{gig.rating}/5</span>
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* Rearranged Fixed Map Controls Cluster (Non-moveable, Compact 2-Column Layout) */}
      {currentView === 'map' && (
        <div className="fixed bottom-6 right-5 z-[9999] flex items-end gap-2.5 pointer-events-auto">
          {/* Left Column: Zoom In, Zoom Out & Back to My Location */}
          <div className="flex flex-col items-center space-y-2">
            <button
              onClick={handleZoomIn}
              title="Zoom In"
              className="w-10 h-10 bg-white hover:bg-gray-100 text-gray-900 rounded-full shadow-xl border-2 border-gray-300 flex items-center justify-center transition transform active:scale-95"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
            </button>

            <button
              onClick={handleZoomOut}
              title="Zoom Out"
              className="w-10 h-10 bg-white hover:bg-gray-100 text-gray-900 rounded-full shadow-xl border-2 border-gray-300 flex items-center justify-center transition transform active:scale-95"
            >
              <Minus className="w-4 h-4 stroke-[2.5]" />
            </button>

            <button
              onClick={handleLocateMe}
              title="Back to My Location"
              aria-label="Back to My Location"
              className="w-10 h-10 bg-white hover:bg-blue-50 text-blue-600 rounded-full shadow-xl border-2 border-blue-400 flex items-center justify-center transition transform active:scale-95"
            >
              <LocateFixed className={`w-4 h-4 stroke-[2.5] ${isLocatingMap ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Right Column: Compass Menu, Satellite, 3D View & Country Flag */}
          <div className="flex flex-col items-center space-y-2">
            <button
              onClick={() => {
                if (soundEnabled) playClickSound();
                setPhoneMenuOpen(prev => !prev);
              }}
              title="Open Menu"
              className="w-11 h-11 bg-gradient-to-tr from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-full shadow-2xl border-2 border-white flex items-center justify-center transition transform active:scale-95"
            >
              <Compass className="w-5 h-5" />
            </button>

            <button
              onClick={() => {
                if (soundEnabled) playClickSound();
                setIsSatellite(prev => !prev);
              }}
              title={isSatellite ? 'Switch to Street Map' : 'Switch to Satellite'}
              className={`w-10 h-10 rounded-full shadow-xl border-2 flex items-center justify-center transition transform active:scale-95 ${
                isSatellite
                  ? 'bg-blue-600 border-blue-700 text-white shadow-blue-500/50'
                  : 'bg-white border-gray-300 text-gray-900 hover:bg-gray-100'
              }`}
            >
              <Globe className="w-4 h-4 stroke-[2.5]" />
            </button>

            <button
              onClick={() => {
                if (soundEnabled) playClickSound();
                setIs3DMode(prev => !prev);
              }}
              title={is3DMode ? '3D Mode: Active (Click to return to 2D)' : 'Toggle 3D Perspective Tilt View'}
              className={`w-10 h-10 rounded-full shadow-xl border-2 flex items-center justify-center transition transform active:scale-95 ${
                is3DMode
                  ? 'bg-gradient-to-tr from-indigo-600 to-purple-600 border-indigo-300 text-white shadow-indigo-500/50 ring-2 ring-indigo-400'
                  : 'bg-white border-gray-300 text-gray-900 hover:bg-gray-100'
              }`}
            >
              <Box className="w-4 h-4 stroke-[2.5]" />
            </button>

            <button
              onClick={() => {
                if (soundEnabled) playClickSound();
                if (!countryLocked) {
                  setCountryModalOpen(true);
                }
              }}
              title={
                countryLocked
                  ? `${selectedCountry.country} (${selectedCountry.currencyCode}) • Locked`
                  : `Select Country & Currency: ${selectedCountry.country} (${selectedCountry.currencyCode})`
              }
              aria-label={`Country (${selectedCountry.country})`}
              className={`w-9 h-9 rounded-full bg-white/95 backdrop-blur-md shadow-lg border-2 flex items-center justify-center transition ${
                countryLocked
                  ? 'border-emerald-500 cursor-default'
                  : 'border-gray-300 hover:bg-white hover:border-emerald-500 transform active:scale-95'
              }`}
            >
              <span className="text-base leading-none">{selectedCountry.flag}</span>
            </button>
          </div>
        </div>
      )}

      {/* Phone Menu Popup Drawer with dynamic icons & Floating Tools */}
      {phoneMenuOpen && currentView === 'map' && (
        <div className="absolute bottom-32 right-6 z-[10000] w-80 bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl border-2 border-gray-200 p-4 space-y-3 pointer-events-auto animate-in fade-in slide-in-from-bottom-3 duration-200 overflow-hidden">
          <FloatingToolsBackdrop count={9} />
          <div className="relative z-10 flex items-center space-x-2.5 border-b border-gray-100 pb-2.5">
            <button
              onClick={() => {
                if (soundEnabled) playClickSound();
                setPhoneMenuOpen(false);
              }}
              aria-label="Back"
              title="Back"
              className="p-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 hover:text-gray-900 transition"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <h4 className="font-bold text-sm text-gray-900 flex items-center space-x-2">
              <Compass className="w-4 h-4 text-blue-600" />
              <span>Quick Actions</span>
            </h4>
          </div>

          <div className="relative z-10 grid grid-cols-2 gap-2">
            {/* Profile Feature (Shown in User Sub / Default, NOT in Tenant Sub) */}
            {!tenantSubActive && (
              <button
                onClick={() => {
                  if (soundEnabled) playClickSound();
                  setPhoneMenuOpen(false);
                  setProfileModalOpen(true);
                }}
                className="p-3 bg-gradient-to-tr from-indigo-50 via-purple-50 to-blue-50 hover:from-indigo-100 hover:to-blue-100 border-2 border-indigo-200 rounded-2xl flex items-center space-x-3 text-left transition col-span-2 shadow-xs group"
              >
                <div className="relative w-11 h-11 rounded-full flex-shrink-0 border-2 border-indigo-500 overflow-hidden shadow-md bg-indigo-600 flex items-center justify-center">
                  {userProfile.selfieImage || selfieImage ? (
                    <img
                      src={userProfile.selfieImage || selfieImage || ''}
                      alt="Selfie"
                      className="w-full h-full object-cover rounded-full group-hover:scale-105 transition"
                    />
                  ) : (
                    <UserCircle className="w-7 h-7 text-white" />
                  )}
                  <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full"></span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-1.5">
                    <span className="font-bold text-xs text-indigo-950 truncate">
                      {userProfile.name} {userProfile.surname}
                    </span>
                    <span className="text-[9px] bg-indigo-200 text-indigo-800 font-bold px-1.5 py-0.2 rounded-full uppercase tracking-wider">
                      Profile
                    </span>
                  </div>
                  <p className="text-[10px] text-indigo-700/80 truncate mt-0.5">
                    {userProfile.location || 'Click to view selfie & details'}
                  </p>
                </div>
              </button>
            )}

            {/* Signup / Sign-in */}
            <button
              onClick={() => {
                if (soundEnabled) playClickSound();
                setPhoneMenuOpen(false);
                setAuthMode('signin');
                setAuthModalOpen(true);
              }}
              className="p-2.5 bg-sky-50 hover:bg-sky-100 border border-sky-200 rounded-2xl flex items-center justify-center space-x-2 text-center transition col-span-2"
            >
              <div className="w-6 h-6 bg-sky-600 text-white rounded-full flex items-center justify-center shadow-xs">
                <User className="w-3.5 h-3.5" />
              </div>
              <span className="font-bold text-xs text-sky-900">
                {userLoggedIn ? `Account (${userLoggedIn.split('@')[0]})` : 'Signup / Sign-in'}
              </span>
            </button>

            {/* If User Sub is active, show ONLY: Create gig, Referrals, Seekers, Settings, Upgrade (+ Tenant Dash if Tenant sub active) */}
            {(!userSubActive || tenantSubActive) && (
              <button
                onClick={() => {
                  if (soundEnabled) playClickSound();
                  if (!userLoggedIn) {
                    setPhoneMenuOpen(false);
                    setAuthModalOpen(true);
                    return;
                  }
                  setPhoneMenuOpen(false);
                  setAddCompanyModal(true);
                }}
                className="p-3 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-2xl flex flex-col items-center text-center transition"
              >
                <div className="w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center mb-1.5 shadow-sm">
                  <Building2 className="w-4 h-4" />
                </div>
                <span className="font-bold text-xs text-purple-900">Add Company</span>
              </button>
            )}

            {/* Create Gig */}
            <button
              onClick={() => {
                if (soundEnabled) playClickSound();
                if (!userLoggedIn) {
                  setPhoneMenuOpen(false);
                  setAuthModalOpen(true);
                  return;
                }
                setPhoneMenuOpen(false);
                setCreateGigModal(true);
              }}
              className="p-3 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-2xl flex flex-col items-center text-center transition"
            >
              <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center mb-1.5 shadow-sm">
                <Briefcase className="w-4 h-4" />
              </div>
              <span className="font-bold text-xs text-blue-900">Create Gig</span>
            </button>

            {/* Seekers */}
            <button
              onClick={() => {
                if (soundEnabled) playClickSound();
                setPhoneMenuOpen(false);
                setCurrentView('seekers');
              }}
              className="p-3 bg-green-50 hover:bg-green-100 border border-green-200 rounded-2xl flex flex-col items-center text-center transition"
            >
              <div className="w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center mb-1.5 shadow-sm">
                <Users className="w-4 h-4" />
              </div>
              <span className="font-bold text-xs text-green-900">Seekers</span>
            </button>

            {/* Referrals */}
            <button
              onClick={() => {
                if (soundEnabled) playClickSound();
                setPhoneMenuOpen(false);
                setCurrentView('referrals');
              }}
              className="p-3 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-2xl flex flex-col items-center text-center transition"
            >
              <div className="w-8 h-8 bg-amber-600 text-white rounded-full flex items-center justify-center mb-1.5 shadow-sm">
                <Share2 className="w-4 h-4" />
              </div>
              <span className="font-bold text-xs text-amber-900">Referrals</span>
            </button>

            {/* Tenant Dash (Only if tenant sub active) */}
            {tenantSubActive && (
              <button
                onClick={() => {
                  if (soundEnabled) playClickSound();
                  setPhoneMenuOpen(false);
                  setCurrentView('tenant-dash');
                }}
                className="p-3 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-2xl flex flex-col items-center text-center transition col-span-2"
              >
                <div className="w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center mb-1.5 shadow-sm">
                  <LayoutDashboard className="w-4 h-4" />
                </div>
                <span className="font-bold text-xs text-indigo-900">Tenant Dash</span>
              </button>
            )}
          </div>

          {/* Upgrade & Settings */}
          <div className="relative z-10 grid grid-cols-2 gap-2 pt-1">
            <button
              onClick={() => {
                if (soundEnabled) playClickSound();
                setPhoneMenuOpen(false);
                setUpgradeModalOpen(true);
              }}
              className="py-2.5 px-3 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-2xl flex items-center justify-center space-x-1.5 transition text-amber-800"
            >
              <Crown className="w-4 h-4 text-amber-600" />
              <span className="font-bold text-xs">Upgrade</span>
            </button>

            <button
              onClick={() => {
                if (soundEnabled) playClickSound();
                setPhoneMenuOpen(false);
                setSettingsModalOpen(true);
              }}
              className="py-2.5 px-3 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-2xl flex items-center justify-center space-x-1.5 transition text-gray-800"
            >
              <Settings className="w-4 h-4 text-gray-700" />
              <span className="font-bold text-xs">Settings</span>
            </button>
          </div>
        </div>
      )}


      {/* Docked Bottom Menu Bar with Floating Tools, Profile & Account (Hidden when user is logged in) */}
      {currentView === 'map' && !userLoggedIn && (
        <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 z-[9999] pointer-events-auto">
          <div className="relative overflow-hidden bg-white/95 backdrop-blur-md border-t border-x border-gray-300 shadow-2xl rounded-t-2xl px-6 sm:px-8 py-2 flex items-center justify-center space-x-6 sm:space-x-8">
            <FloatingToolsBackdrop compact count={6} />
            {!tenantSubActive && (
              <button
                onClick={() => {
                  if (soundEnabled) playClickSound();
                  setProfileModalOpen(true);
                }}
                title="Open Profile"
                className="relative z-10 flex flex-col items-center group transition transform active:scale-95"
              >
                <div className="relative w-8 h-8 rounded-full flex items-center justify-center shadow-md group-hover:scale-105 transition overflow-hidden border border-indigo-500 bg-indigo-600 text-white">
                  {userProfile.selfieImage || selfieImage ? (
                    <img src={userProfile.selfieImage || selfieImage || ''} alt="Selfie" className="w-full h-full object-cover" />
                  ) : (
                    <UserCircle className="w-5 h-5 text-white" />
                  )}
                  <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full" />
                </div>
                <span className="text-[10px] font-bold text-gray-700 mt-1 group-hover:text-indigo-600">
                  Profile
                </span>
              </button>
            )}

            <button
              onClick={() => {
                if (soundEnabled) playClickSound();
                setAuthModalOpen(true);
              }}
              title="Sign In / Sign Up"
              className="relative z-10 flex flex-col items-center group transition transform active:scale-95"
            >
              <div className="relative w-8 h-8 bg-gradient-to-tr from-blue-600 to-indigo-600 text-white rounded-full flex items-center justify-center shadow-md group-hover:scale-105 transition">
                <User className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-bold text-gray-700 mt-1 group-hover:text-blue-600">
                Account
              </span>
            </button>
          </div>
        </div>
      )}

      {/* ========================================================== */}
      {/* SEEKERS FULLSCREEN VIEW (SEARCH BAR & SEEKERS ONLY)        */}
      {/* ========================================================== */}
      {currentView === 'seekers' && (
        <div className="absolute inset-0 z-[10050] bg-gradient-to-br from-blue-50/75 via-indigo-50/75 to-purple-50/75 backdrop-blur-2xl flex flex-col font-sans overflow-y-auto">
          {/* Blurred Background Floating Tools Wallpaper Elements */}
          <FloatingToolsBackdrop count={14} />

          {/* Spaced Top Row: Back Button & Search Bar separated cleanly */}
          <div className="sticky top-0 z-[10060] max-w-3xl w-full mx-auto px-4 pt-4 pb-2 flex items-center gap-3 pointer-events-auto">
            <button
              onClick={() => {
                if (soundEnabled) playClickSound();
                setCurrentView('map');
              }}
              aria-label="Back"
              title="Back"
              className="p-3 bg-white hover:bg-gray-100 shadow-2xl border-2 border-gray-300 rounded-2xl text-gray-800 transition shrink-0"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            <div className="flex-1 min-w-0 relative flex items-center shadow-2xl rounded-2xl bg-white/95 backdrop-blur-md border-2 border-gray-300 overflow-hidden">
              <FloatingToolsBackdrop compact count={6} />
              <Search className="absolute left-4 w-5 h-5 text-gray-600 z-10" />
              <input
                type="text"
                placeholder="Search seekers by skill, name..."
                value={seekerSearchQuery}
                onChange={e => setSeekerSearchQuery(e.target.value)}
                className="relative z-10 w-full pl-12 pr-4 py-3.5 bg-transparent text-sm text-gray-900 font-medium focus:outline-none placeholder-gray-400"
              />
            </div>
          </div>

          {/* Seekers List Only */}
          <div className="max-w-3xl w-full mx-auto px-4 py-4 relative z-10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {seekers
                .filter(s => s.name.toLowerCase().includes(seekerSearchQuery.toLowerCase()) || s.skill.toLowerCase().includes(seekerSearchQuery.toLowerCase()))
                .map(seeker => {
                  const rateLabel = formatCurrency(seeker.rateUsd || parseUsdFromString(seeker.rate) || 35, selectedCountry, 0) + '/hr';
                  return (
                    <div key={seeker.id} className="bg-white/95 backdrop-blur-md border-2 border-gray-200 rounded-3xl p-5 shadow-lg hover:border-green-300 transition flex flex-col justify-between space-y-4">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center space-x-3">
                          <div className="w-12 h-12 bg-gradient-to-tr from-green-600 to-emerald-600 text-white rounded-2xl flex items-center justify-center font-bold text-lg shadow-md">
                            {seeker.name.charAt(0)}
                          </div>
                          <div>
                            <h4 className="font-bold text-base text-gray-900">{seeker.name}</h4>
                            <span className="text-xs text-green-600 font-semibold">{seeker.status}</span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-1 text-amber-500 bg-amber-50 px-2.5 py-1 rounded-full text-xs font-bold">
                          <Star className="w-3.5 h-3.5 fill-amber-500" />
                          <span>{seeker.rating}</span>
                        </div>
                      </div>

                      <p className="text-xs text-gray-600">{seeker.skill}</p>

                      <div className="flex justify-between items-center pt-3 border-t border-gray-100">
                        <span className="text-sm font-bold text-gray-900">{rateLabel}</span>
                        <button
                          onClick={() => {
                            if (soundEnabled) playClickSound();
                            setSelectedSeekerForHire(seeker);
                          }}
                          className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold rounded-xl transition shadow-md"
                        >
                          Hire Seeker
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}

      {/* Hire Seeker Modal */}
      {selectedSeekerForHire && (
        <div className="fixed inset-0 z-[10100] flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 pointer-events-auto">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 space-y-4 relative overflow-hidden">
            <FloatingToolsBackdrop compact count={6} />
            <div className="flex items-center space-x-3 relative z-10">
              <button
                onClick={() => {
                  if (soundEnabled) playClickSound();
                  setSelectedSeekerForHire(null);
                }}
                aria-label="Back"
                title="Back"
                className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 hover:text-gray-900 transition shrink-0"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h3 className="font-bold text-xl text-gray-900 flex items-center space-x-2">
                <Users className="w-5 h-5 text-green-600" />
                <span>Hire {selectedSeekerForHire.name}</span>
              </h3>
            </div>
            <p className="text-xs text-gray-600 relative z-10">
              Assign a gig to this professional ({formatCurrency(selectedSeekerForHire.rateUsd || 35, selectedCountry, 0)}/hr). They will be pinned on your map instantly.
            </p>
            <div className="space-y-3 relative z-10">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Gig Assignment Title</label>
                <input
                  type="text"
                  placeholder="e.g. Frontend Web Redesign Task"
                  value={hireGigTitle}
                  onChange={e => setHireGigTitle(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-2xl text-sm focus:outline-none focus:border-green-600 bg-white/90"
                />
              </div>
              <button
                onClick={() => {
                  if (soundEnabled) playClickSound();
                  if (!hireGigTitle.trim()) return;
                  const rateUsd = selectedSeekerForHire.rateUsd || parseUsdFromString(selectedSeekerForHire.rate) || 35;
                  const rateFormatted = formatCurrency(rateUsd, selectedCountry, 0) + '/hr';
                  const newGig: GigItem = {
                    id: Date.now().toString(),
                    title: `Hired: ${selectedSeekerForHire.name} (${hireGigTitle})`,
                    description: `Assigned seeker: ${selectedSeekerForHire.name} at rate ${rateFormatted}`,
                    lat: selectedSeekerForHire.lat,
                    lng: selectedSeekerForHire.lng,
                    budget: rateFormatted,
                    budgetUsd: rateUsd,
                    creatorEmail: currentUserEmail,
                    creatorName: currentUserName,
                    status: 'open'
                  };
                  setGigs(prev => [...prev, newGig]);
                  setSelectedSeekerForHire(null);
                  setHireGigTitle('');
                  setCurrentView('map');

                  if (mapRef.current) {
                    mapRef.current.setView([selectedSeekerForHire.lat, selectedSeekerForHire.lng], 16);
                  }
                }}
                className="w-full py-3.5 bg-green-600 hover:bg-green-700 text-white rounded-2xl font-semibold text-sm transition shadow-lg"
              >
                Confirm Hire & Pin on Map
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================== */}
      {/* REFERRALS FULLSCREEN VIEW (SEARCH BAR & REFERRALS ONLY)    */}
      {/* ========================================================== */}
      {currentView === 'referrals' && (
        <div className="absolute inset-0 z-[10050] bg-gradient-to-br from-amber-50/75 via-orange-50/75 to-yellow-50/75 backdrop-blur-2xl flex flex-col font-sans overflow-y-auto">
          {/* Blurred Background Floating Tools Wallpaper Elements */}
          <FloatingToolsBackdrop count={14} />

          {/* Spaced Top Row: Back Button & Search Bar separated cleanly */}
          <div className="sticky top-0 z-[10060] max-w-4xl w-full mx-auto px-4 pt-4 pb-2 flex items-center gap-3 pointer-events-auto">
            <button
              onClick={() => {
                if (soundEnabled) playClickSound();
                setCurrentView('map');
              }}
              aria-label="Back"
              title="Back"
              className="p-3 bg-white hover:bg-gray-100 shadow-2xl border-2 border-gray-300 rounded-2xl text-gray-800 transition shrink-0"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            <div className="flex-1 min-w-0 relative flex items-center shadow-2xl rounded-2xl bg-white/95 backdrop-blur-md border-2 border-gray-300 overflow-hidden">
              <FloatingToolsBackdrop compact count={6} />
              <Search className="absolute left-4 w-5 h-5 text-gray-600 z-10" />
              <input
                type="text"
                placeholder="Search referrals by username..."
                value={referralSearchQuery}
                onChange={e => setReferralSearchQuery(e.target.value)}
                className="relative z-10 w-full pl-12 pr-4 py-3.5 bg-transparent text-sm text-gray-900 font-medium focus:outline-none placeholder-gray-400"
              />
            </div>
          </div>

          {/* Referrals List Only */}
          <div className="max-w-4xl w-full mx-auto px-4 py-4 relative z-10">
            <div className="space-y-3">
              {referrals
                .filter(r => r.username.toLowerCase().includes(referralSearchQuery.toLowerCase()))
                .map(ref => {
                  const sameCountry = isReferralSameCountry(ref);
                  const effectiveUsd = getReferralEffectiveCommissionUsd(ref);
                  const trialInfo = getReferralTrialInfo(ref);
                  return (
                  <div
                    key={ref.id}
                    className={`bg-white/95 backdrop-blur-md border-2 rounded-3xl p-5 shadow-lg transition space-y-3 ${
                      ref.status === 'Frozen'
                        ? 'border-cyan-300 bg-cyan-50/30'
                        : ref.status === 'Rejected'
                        ? 'border-red-200 bg-red-50/20'
                        : !sameCountry
                        ? 'border-rose-200 bg-rose-50/20'
                        : ref.status === 'Approved'
                        ? 'border-green-200'
                        : 'border-amber-200'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div className="flex items-center space-x-3">
                        <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-white shadow-md text-base ${
                          ref.status === 'Frozen'
                            ? 'bg-gradient-to-tr from-cyan-600 to-blue-600'
                            : ref.status === 'Approved'
                            ? 'bg-gradient-to-tr from-green-600 to-emerald-600'
                            : ref.status === 'Rejected'
                            ? 'bg-gradient-to-tr from-red-600 to-rose-600'
                            : 'bg-gradient-to-tr from-amber-500 to-orange-500'
                        }`}>
                          {ref.username.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-1.5">
                            <h4 className="font-bold text-sm text-gray-900">{ref.username}</h4>
                            <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-mono">
                              {ref.tenantCode}
                            </span>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                              sameCountry
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}>
                              {ref.countryFlag || selectedCountry.flag} {ref.countryName || selectedCountry.country}
                            </span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-indigo-100 text-indigo-800">
                              🎁 30-Day Trial ({trialInfo.daysLeft}d left)
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-xs text-gray-500 mt-0.5">
                            <span>Joined: {ref.joinedDate}</span>
                            <span>•</span>
                            <span className={`font-semibold ${sameCountry ? 'text-gray-700' : 'text-rose-600'}`}>
                              Earned: {formatCurrency(effectiveUsd, selectedCountry)}
                            </span>
                            {!sameCountry && (
                              <span className="text-[10px] font-bold text-rose-600">
                                (Blocked outside {selectedCountry.country})
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Status Badge */}
                      <div className="flex items-center space-x-2 self-start sm:self-auto">
                        <span className={`inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-bold ${
                          ref.status === 'Approved'
                            ? 'bg-green-100 text-green-800 border border-green-200'
                            : ref.status === 'Frozen'
                            ? 'bg-cyan-100 text-cyan-800 border border-cyan-300'
                            : ref.status === 'Rejected'
                            ? 'bg-red-100 text-red-800 border border-red-200'
                            : 'bg-amber-100 text-amber-800 border border-amber-200'
                        }`}>
                          {ref.status === 'Approved' && <CheckCircle className="w-3.5 h-3.5 text-green-600" />}
                          {ref.status === 'Frozen' && <Snowflake className="w-3.5 h-3.5 text-cyan-600" />}
                          {ref.status === 'Rejected' && <XCircle className="w-3.5 h-3.5 text-red-600" />}
                          {ref.status === 'Pending' && <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />}
                          <span>{ref.status}</span>
                        </span>
                      </div>
                    </div>

                    {/* Outside Country Earning Restriction Notice */}
                    {!sameCountry && (
                      <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-center space-x-2 text-[11px] text-rose-800">
                        <Globe className="w-4 h-4 text-rose-600 shrink-0" />
                        <span>
                          <strong>No Earnings Outside Country:</strong> Registered in {ref.countryFlag} {ref.countryName}. Referral Tenants cannot earn outside {selectedCountry.flag} {selectedCountry.country}.
                        </span>
                      </div>
                    )}

                    {/* Rule Violation Notice Banner if Frozen */}
                    {ref.status === 'Frozen' && (
                      <div className="p-3 bg-cyan-100/70 border border-cyan-300 rounded-2xl flex items-start space-x-2 text-xs text-cyan-900">
                        <ShieldAlert className="w-4 h-4 text-cyan-700 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold">Account Frozen (Rules Violation): </span>
                          <span>{ref.freezeReason || 'Rule violation: Account temporarily locked due to platform regulation breach.'}</span>
                        </div>
                      </div>
                    )}

                    {/* Management Action Buttons */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-gray-100 text-xs">
                      <span className="text-[11px] text-gray-400">Activity: {ref.activitiesCount || 0} gigs • Last active: {ref.lastActive || 'Recently'}</span>
                      <div className="flex items-center space-x-1.5">
                        {/* View Button */}
                        <button
                          onClick={() => {
                            if (soundEnabled) playClickSound();
                            setSelectedReferralForView(ref);
                          }}
                          className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold flex items-center space-x-1 transition"
                        >
                          <Eye className="w-3.5 h-3.5 text-gray-600" />
                          <span>View</span>
                        </button>

                        {/* Approve Button */}
                        {ref.status !== 'Approved' && (
                          <button
                            onClick={() => handleApproveReferral(ref.id)}
                            className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold flex items-center space-x-1 transition shadow-sm"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                            <span>Approve</span>
                          </button>
                        )}

                        {/* Reject Button */}
                        {ref.status !== 'Rejected' && (
                          <button
                            onClick={() => handleRejectReferral(ref.id)}
                            className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-xl font-bold flex items-center space-x-1 transition"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Reject</span>
                          </button>
                        )}

                        {/* Freeze / Unfreeze Button */}
                        {ref.status === 'Frozen' ? (
                          <button
                            onClick={() => handleUnfreezeReferral(ref.id)}
                            className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl font-bold flex items-center space-x-1 transition shadow-sm"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Unfreeze Account</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => handleOpenFreezeModal(ref)}
                            className="px-3 py-1.5 bg-cyan-50 hover:bg-cyan-100 text-cyan-800 border border-cyan-300 rounded-xl font-bold flex items-center space-x-1 transition"
                          >
                            <Snowflake className="w-3.5 h-3.5 text-cyan-600" />
                            <span>Freeze Account</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                  );
                })}

              {referrals.length === 0 && (
                <div className="text-center py-12 bg-white/80 rounded-3xl border border-gray-200">
                  <Share2 className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm font-bold text-gray-600">No referrals found</p>
                  <p className="text-xs text-gray-400 mt-1">Share your tenant link to invite users.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================== */}
      {/* TENANT DASHBOARD VIEW (TOP-BAR FEATURE NAVIGATION)         */}
      {/* ========================================================== */}
      {currentView === 'tenant-dash' && (() => {
        const tenantSubsList = subSubmissions.filter(s => s.plan === 'tenant');
        const userSubsList = subSubmissions.filter(s => s.plan === 'user');
        const pendingTenantCount = tenantSubsList.filter(s => s.status === 'Pending').length;
        const pendingUserCount = userSubsList.filter(s => s.status === 'Pending').length;

        const handleSaveFees = (e: React.FormEvent) => {
          e.preventDefault();
          if (soundEnabled) playClickSound();
          const parsedTenantLocal = parseFloat(tenantFeeDraft.replace(',', '.'));
          const parsedUserLocal = parseFloat(userFeeDraft.replace(',', '.'));
          const rate = selectedCountry.rateFromUsd || 1;
          if (!isNaN(parsedTenantLocal) && parsedTenantLocal >= 0) {
            setTenantSubFeeUsd(Number((parsedTenantLocal / rate).toFixed(4)));
          }
          if (!isNaN(parsedUserLocal) && parsedUserLocal >= 0) {
            setUserSubFeeUsd(Number((parsedUserLocal / rate).toFixed(4)));
          }
          setFeeSavedNotice(true);
          setTimeout(() => setFeeSavedNotice(false), 2500);
        };

        const handleUpdateSubmissionStatus = (id: string, status: 'Approved' | 'Rejected') => {
          if (soundEnabled) playClickSound();
          setSubSubmissions(prev => prev.map(item => item.id === id ? { ...item, status } : item));
          setSelectedSubmissionForView(prev => prev && prev.id === id ? { ...prev, status } : prev);
        };

        const topBarTabs = [
          {
            id: 'profits' as const,
            label: 'Profits',
            Icon: TrendingUp,
            badge: 0,
            activeCls: 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
          },
          {
            id: 'referrals' as const,
            label: 'Referrals',
            Icon: Share2,
            badge: referrals.length,
            activeCls: 'bg-amber-600 text-white border-amber-600 shadow-sm'
          },
          {
            id: 'fees' as const,
            label: 'Sub Fees',
            Icon: Sliders,
            badge: 0,
            activeCls: 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
          },
          {
            id: 'tenant-subs' as const,
            label: 'Tenant Subs',
            Icon: ClipboardList,
            badge: pendingTenantCount,
            activeCls: 'bg-rose-600 text-white border-rose-600 shadow-sm'
          },
          {
            id: 'user-subs' as const,
            label: 'User Subs',
            Icon: FileCheck,
            badge: pendingUserCount,
            activeCls: 'bg-teal-600 text-white border-teal-600 shadow-sm'
          }
        ];

        const renderSubmissionsPanel = (plan: 'tenant' | 'user', list: SubSubmissionItem[]) => (
          <div className="bg-white/95 backdrop-blur-md border border-gray-200 rounded-2xl p-3.5 shadow-md space-y-2.5 relative overflow-hidden">
            <FloatingToolsBackdrop compact count={5} />
            <div className="relative z-10 flex items-center justify-between gap-2 pb-2 border-b border-gray-100">
              <div className="flex items-center space-x-2 min-w-0">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${plan === 'tenant' ? 'bg-rose-100 text-rose-600' : 'bg-teal-100 text-teal-600'}`}>
                  {plan === 'tenant' ? <ClipboardList className="w-4 h-4" /> : <FileCheck className="w-4 h-4" />}
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-gray-900 truncate">
                    {plan === 'tenant' ? 'Tenant Sub Submissions' : 'User Sub Submissions'}
                  </h3>
                  <p className="text-[10px] text-gray-500 truncate">
                    Verify live face selfie & ID documents for {plan === 'tenant' ? 'Tenant Sub' : 'User Sub'}
                  </p>
                </div>
              </div>
            </div>

            {list.length === 0 ? (
              <div className="relative z-10 py-6 text-center space-y-1.5">
                {plan === 'tenant' ? (
                  <ClipboardList className="w-9 h-9 text-gray-300 mx-auto" />
                ) : (
                  <FileCheck className="w-9 h-9 text-gray-300 mx-auto" />
                )}
                <p className="text-xs font-bold text-gray-700">
                  No {plan === 'tenant' ? 'Tenant Sub' : 'User Sub'} submissions yet
                </p>
                <p className="text-[10px] text-gray-400">
                  Applicants submitting Selfie & ID from the Upgrade modal appear here automatically.
                </p>
              </div>
            ) : (
              <div className="relative z-10 space-y-2 max-h-[260px] overflow-y-auto pr-0.5">
                {list.slice(0, 4).map(sub => (
                  <div
                    key={sub.id}
                    className="p-2.5 rounded-xl border border-gray-200 bg-gray-50/80 flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center space-x-2.5 min-w-0">
                      {sub.selfieImage ? (
                        <img
                          src={sub.selfieImage}
                          alt={sub.email}
                          className="w-9 h-9 rounded-full object-cover border border-indigo-200 shrink-0"
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs shrink-0">
                          {sub.email.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="flex items-center space-x-1.5">
                          <span className="text-xs font-bold text-gray-900 truncate">{sub.email}</span>
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${
                            sub.status === 'Approved'
                              ? 'bg-emerald-100 text-emerald-700'
                              : sub.status === 'Rejected'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-amber-100 text-amber-700'
                          }`}>
                            {sub.status}
                          </span>
                        </div>
                        <p className="text-[10px] text-gray-500 truncate">
                          {sub.countryFlag} {sub.countryName} • ID: {sub.idFileName} • {sub.submittedAt}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          if (soundEnabled) playClickSound();
                          setSelectedSubmissionForView(sub);
                        }}
                        className="p-1.5 bg-white hover:bg-gray-100 border border-gray-200 rounded-lg text-gray-700 transition"
                        title="Inspect submission"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      {sub.status !== 'Approved' && (
                        <button
                          type="button"
                          onClick={() => handleUpdateSubmissionStatus(sub.id, 'Approved')}
                          className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold transition"
                        >
                          Approve
                        </button>
                      )}
                      {sub.status !== 'Rejected' && (
                        <button
                          type="button"
                          onClick={() => handleUpdateSubmissionStatus(sub.id, 'Rejected')}
                          className="px-2 py-1 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-lg text-[10px] font-bold transition"
                        >
                          Reject
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );

        return (
          <div className="absolute inset-0 z-[10050] bg-gradient-to-br from-indigo-50/75 via-blue-50/75 to-purple-50/75 backdrop-blur-2xl flex flex-col justify-between font-sans overflow-hidden p-3 sm:p-4">
            {/* Blurred Background Floating Tools Wallpaper Elements */}
            <FloatingToolsBackdrop count={12} />

            {/* TOP BAR: Back Button + Dashboard Title + Separated Icon-Over-Name Feature Tabs */}
            <div className="max-w-4xl w-full mx-auto relative z-10 bg-white/90 backdrop-blur-md px-3 py-2.5 rounded-2xl border border-indigo-200 shadow-sm overflow-hidden">
              <FloatingToolsBackdrop compact count={5} />
              <div className="relative z-10 flex flex-col gap-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center space-x-2.5 min-w-0">
                    <button
                      onClick={() => {
                        if (soundEnabled) playClickSound();
                        setCurrentView('map');
                      }}
                      aria-label="Back"
                      title="Back"
                      className="p-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-800 transition shrink-0"
                    >
                      <ArrowLeft className="w-4 h-4" />
                    </button>
                    <div className="min-w-0">
                      <h2 className="text-sm sm:text-base font-bold text-gray-900 flex items-center space-x-1.5 truncate">
                        <LayoutDashboard className="w-4 h-4 text-indigo-600 shrink-0" />
                        <span className="truncate">Tenant Dashboard</span>
                      </h2>
                      <p className="text-[10px] text-gray-500 truncate">
                        {selectedCountry.flag} {selectedCountry.currencyCode} • Same-country referrals only
                      </p>
                    </div>
                  </div>
                  <span className="text-[9px] bg-indigo-100 text-indigo-700 font-bold px-2.5 py-1 rounded-full shrink-0">
                    Tenant Active
                  </span>
                </div>

                {/* Top Bar Separated Feature Icons with Name Under Each Icon */}
                <div className="grid grid-cols-5 gap-1.5 pt-1 border-t border-indigo-100/80">
                  {topBarTabs.map(tab => {
                    const TabIcon = tab.Icon;
                    const isActive = tenantDashTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => {
                          if (soundEnabled) playClickSound();
                          setTenantDashTab(tab.id);
                        }}
                        className={`relative flex flex-col items-center justify-center py-1.5 px-1 rounded-xl border transition ${
                          isActive
                            ? tab.activeCls
                            : 'bg-white/80 hover:bg-indigo-50 text-gray-700 border-gray-200'
                        }`}
                      >
                        <TabIcon className="w-4 h-4 mb-0.5 shrink-0" />
                        <span className="text-[10px] font-bold leading-tight text-center truncate max-w-full">
                          {tab.label}
                        </span>
                        {tab.badge > 0 && (
                          <span className={`absolute top-1 right-1 min-w-[14px] h-[14px] px-1 rounded-full text-[8px] font-black flex items-center justify-center ${
                            isActive ? 'bg-white text-gray-900' : 'bg-rose-600 text-white'
                          }`}>
                            {tab.badge}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* ACTIVE FEATURE PANEL (NO-SCROLL CLEAN VIEW) */}
            <div className="max-w-4xl w-full mx-auto my-auto relative z-10 py-2">
              {/* TAB 1: PROFITS & WORKSPACE STATS */}
              {tenantDashTab === 'profits' && (
                <div className="space-y-2.5">
                  <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-700 text-white rounded-2xl px-4 py-3 shadow-md border border-emerald-400/40 relative overflow-hidden">
                    <FloatingToolsBackdrop compact count={5} className="opacity-35" />
                    <div className="flex items-center justify-between gap-2 relative z-10">
                      <div className="min-w-0">
                        <div className="inline-flex items-center space-x-1 px-2 py-0.5 bg-white/20 rounded-full text-[9px] font-bold uppercase tracking-wider text-emerald-100">
                          <span>{selectedCountry.flag}</span>
                          <span>Total Profit Balance ({selectedCountry.currencyCode})</span>
                        </div>
                        <h3 className="text-2xl sm:text-3xl font-black tracking-tight text-white leading-tight mt-1">
                          {formatCurrency(totalProfitBalance, selectedCountry)}
                        </h3>
                      </div>
                      <div className="flex items-center space-x-1.5 shrink-0">
                        <div className="p-2 bg-white/20 rounded-xl border border-white/20">
                          <TrendingUp className="w-4 h-4 text-emerald-200" />
                        </div>
                        <span className="text-[10px] font-bold text-emerald-100 bg-white/15 px-2.5 py-1 rounded-full">
                          0.0% This Month
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="bg-white/95 backdrop-blur-md border border-indigo-200 rounded-2xl px-3.5 py-2.5 shadow-sm relative overflow-hidden">
                      <FloatingToolsBackdrop compact count={3} />
                      <div className="relative z-10 flex items-center justify-between">
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wide truncate">Tenant Sub Profit</span>
                        <div className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                          <Building2 className="w-3.5 h-3.5" />
                        </div>
                      </div>
                      <h4 className="relative z-10 text-lg sm:text-xl font-black text-indigo-700 leading-tight mt-1">
                        {formatCurrency(tenantSubProfit, selectedCountry)}
                      </h4>
                      <p className="relative z-10 text-[10px] text-gray-500 truncate mt-0.5">
                        Monthly Fee: {formatCurrency(tenantSubFeeUsd, selectedCountry)}/mo
                      </p>
                    </div>

                    <div className="bg-white/95 backdrop-blur-md border border-teal-200 rounded-2xl px-3.5 py-2.5 shadow-sm relative overflow-hidden">
                      <FloatingToolsBackdrop compact count={3} />
                      <div className="relative z-10 flex items-center justify-between">
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wide truncate">User Sub Profit</span>
                        <div className="w-6 h-6 rounded-lg bg-teal-100 text-teal-600 flex items-center justify-center shrink-0">
                          <Users className="w-3.5 h-3.5" />
                        </div>
                      </div>
                      <h4 className="relative z-10 text-lg sm:text-xl font-black text-teal-700 leading-tight mt-1">
                        {formatCurrency(userSubProfit, selectedCountry)}
                      </h4>
                      <p className="relative z-10 text-[10px] text-gray-500 truncate mt-0.5">
                        Monthly Fee: {formatCurrency(userSubFeeUsd, selectedCountry)}/mo
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2.5">
                    <div className="bg-white/95 backdrop-blur-md border border-gray-200 rounded-xl px-3 py-2.5 shadow-sm">
                      <span className="text-[10px] font-bold text-gray-400 block truncate">Total Branches</span>
                      <h3 className="text-base sm:text-lg font-black text-gray-900 leading-tight mt-0.5">0</h3>
                      <span className="text-[9px] text-gray-500 font-medium block truncate">0 this month</span>
                    </div>
                    <div className="bg-white/95 backdrop-blur-md border border-gray-200 rounded-xl px-3 py-2.5 shadow-sm">
                      <span className="text-[10px] font-bold text-gray-400 block truncate">Active Team</span>
                      <h3 className="text-base sm:text-lg font-black text-gray-900 leading-tight mt-0.5">0</h3>
                      <span className="text-[9px] text-gray-500 font-medium block truncate">0 verified</span>
                    </div>
                    <div className="bg-white/95 backdrop-blur-md border border-gray-200 rounded-xl px-3 py-2.5 shadow-sm">
                      <span className="text-[10px] font-bold text-gray-400 block truncate">Active Payouts</span>
                      <h3 className="text-base sm:text-lg font-black text-indigo-600 leading-tight truncate mt-0.5">{formatCurrency(0, selectedCountry)}</h3>
                      <span className="text-[9px] text-gray-500 font-medium block truncate">0 payouts</span>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: REFERRALS & TRIAL LINK */}
              {tenantDashTab === 'referrals' && (
                <div className="bg-white/95 backdrop-blur-md border border-amber-200 rounded-2xl p-4 shadow-md space-y-3 relative overflow-hidden">
                  <FloatingToolsBackdrop compact count={5} />
                  <div className="relative z-10 flex items-center justify-between gap-2">
                    <div className="flex items-center space-x-2 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                        <Share2 className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-bold text-sm text-gray-900 truncate">
                          Tenant Referral Link ({selectedCountry.flag} {selectedCountry.country})
                        </h4>
                        <p className="text-[10px] text-gray-500 truncate">
                          All referrals receive a 30-day free trial • Earnings apply inside {selectedCountry.country} only
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-2.5 py-1 rounded-full shrink-0">
                      tenant-ref-99
                    </span>
                  </div>

                  <div className="relative z-10 flex items-center space-x-2">
                    <input
                      type="text"
                      readOnly
                      value="https://geo-osm.app/tenant/tenant-ref-99"
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono text-gray-700"
                    />
                    <button
                      onClick={() => {
                        if (soundEnabled) playClickSound();
                        navigator.clipboard.writeText('https://geo-osm.app/tenant/tenant-ref-99');
                        setCopiedLink(true);
                        setTimeout(() => setCopiedLink(false), 2000);
                      }}
                      className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl transition shrink-0 shadow-xs flex items-center space-x-1.5"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>{copiedLink ? 'Copied!' : 'Copy'}</span>
                    </button>
                  </div>

                  <div className="relative z-10 grid grid-cols-2 gap-2.5 pt-1">
                    <div className="p-2.5 bg-amber-50/70 border border-amber-200 rounded-xl">
                      <span className="text-[10px] font-bold text-amber-800 block">In-Country Referrals</span>
                      <span className="text-lg font-black text-gray-900">{referrals.filter(r => isReferralSameCountry(r)).length}</span>
                    </div>
                    <div className="p-2.5 bg-indigo-50/70 border border-indigo-200 rounded-xl">
                      <span className="text-[10px] font-bold text-indigo-800 block">Free Trial Length</span>
                      <span className="text-lg font-black text-gray-900">30 Days</span>
                    </div>
                  </div>

                  <div className="relative z-10 flex items-center justify-end pt-1 border-t border-gray-100">
                    <button
                      onClick={() => {
                        if (soundEnabled) playClickSound();
                        setCurrentView('referrals');
                      }}
                      className="px-3.5 py-2 bg-gray-900 hover:bg-gray-800 text-white text-xs font-bold rounded-xl transition flex items-center space-x-1.5"
                    >
                      <span>Open Referrals Manager</span>
                      <ArrowLeft className="w-3.5 h-3.5 rotate-180" />
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 3: EDITABLE MONTHLY SUBSCRIPTION FEES (TENANT SUB & USER SUB) */}
              {tenantDashTab === 'fees' && (
                <form
                  onSubmit={handleSaveFees}
                  className="bg-white/95 backdrop-blur-md border border-emerald-200 rounded-2xl p-4 shadow-md space-y-3 relative overflow-hidden"
                >
                  <FloatingToolsBackdrop compact count={5} />
                  <div className="relative z-10 flex items-center justify-between gap-2 pb-2 border-b border-gray-100">
                    <div className="flex items-center space-x-2 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                        <Sliders className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-sm font-bold text-gray-900 truncate">
                          Monthly Subscription Pricing ({selectedCountry.flag} {selectedCountry.currencyCode})
                        </h3>
                        <p className="text-[10px] text-gray-500 truncate">
                          Set monthly subscription fees for Tenant Sub and User Sub plans
                        </p>
                      </div>
                    </div>
                    {feeSavedNotice && (
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2.5 py-1 rounded-full shrink-0">
                        Fees Updated!
                      </span>
                    )}
                  </div>

                  <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-3 rounded-xl bg-rose-50/70 border border-rose-200 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-rose-900 flex items-center space-x-1.5">
                          <Building2 className="w-3.5 h-3.5 text-rose-600" />
                          <span>Tenant Sub Monthly Fee</span>
                        </label>
                        <span className="text-[10px] font-bold text-rose-700">
                          Current: {formatCurrency(tenantSubFeeUsd, selectedCountry)}/mo
                        </span>
                      </div>
                      <div className="flex items-center bg-white border border-rose-300 rounded-xl px-3 py-1.5 focus-within:ring-2 focus-within:ring-rose-400">
                        <span className="text-xs font-black text-gray-500 mr-1.5">{selectedCountry.symbol}</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={tenantFeeDraft}
                          onChange={e => setTenantFeeDraft(e.target.value)}
                          className="w-full text-sm font-bold text-gray-900 outline-none bg-transparent"
                          required
                        />
                        <span className="text-[10px] font-bold text-gray-400 ml-1">/mo</span>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-teal-50/70 border border-teal-200 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-teal-900 flex items-center space-x-1.5">
                          <Users className="w-3.5 h-3.5 text-teal-600" />
                          <span>User Sub Monthly Fee</span>
                        </label>
                        <span className="text-[10px] font-bold text-teal-700">
                          Current: {formatCurrency(userSubFeeUsd, selectedCountry)}/mo
                        </span>
                      </div>
                      <div className="flex items-center bg-white border border-teal-300 rounded-xl px-3 py-1.5 focus-within:ring-2 focus-within:ring-teal-400">
                        <span className="text-xs font-black text-gray-500 mr-1.5">{selectedCountry.symbol}</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={userFeeDraft}
                          onChange={e => setUserFeeDraft(e.target.value)}
                          className="w-full text-sm font-bold text-gray-900 outline-none bg-transparent"
                          required
                        />
                        <span className="text-[10px] font-bold text-gray-400 ml-1">/mo</span>
                      </div>
                    </div>
                  </div>

                  <div className="relative z-10 flex items-center justify-between gap-2 pt-1">
                    <span className="text-[10px] text-gray-500">
                      Updated prices apply immediately in the Upgrade subscription selector.
                    </span>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition flex items-center space-x-1.5 shrink-0"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Save Monthly Fees</span>
                    </button>
                  </div>
                </form>
              )}

              {/* TAB 4: TENANT SUB SUBMISSIONS */}
              {tenantDashTab === 'tenant-subs' && renderSubmissionsPanel('tenant', tenantSubsList)}

              {/* TAB 5: USER SUB SUBMISSIONS */}
              {tenantDashTab === 'user-subs' && renderSubmissionsPanel('user', userSubsList)}
            </div>

            <div className="max-w-4xl w-full mx-auto relative z-10 text-center text-[10px] text-gray-500 font-medium">
              All Tenant Dashboard features are organized in the top bar for instant switching without scrolling.
            </div>
          </div>
        );
      })()}

      {/* INSPECT SUB SUBMISSION MODAL */}
      {selectedSubmissionForView && (
        <div className="fixed inset-0 z-[10120] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 pointer-events-auto">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-5 space-y-4 relative overflow-hidden">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => {
                  if (soundEnabled) playClickSound();
                  setSelectedSubmissionForView(null);
                }}
                aria-label="Back"
                title="Back"
                className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 transition shrink-0"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div className="min-w-0">
                <h3 className="text-base font-bold text-gray-900 truncate">
                  {selectedSubmissionForView.plan === 'tenant' ? 'Tenant Sub' : 'User Sub'} Verification
                </h3>
                <p className="text-[11px] text-gray-500 truncate">{selectedSubmissionForView.email}</p>
              </div>
            </div>

            <div className="space-y-3">
              {selectedSubmissionForView.selfieImage ? (
                <img
                  src={selectedSubmissionForView.selfieImage}
                  alt="Applicant Selfie"
                  className="w-full h-44 object-cover rounded-2xl border border-gray-200"
                />
              ) : (
                <div className="w-full h-32 rounded-2xl bg-gray-100 border border-dashed border-gray-300 flex items-center justify-center text-xs text-gray-500">
                  No face selfie preview stored
                </div>
              )}

              <div className="p-3 bg-gray-50 rounded-2xl border border-gray-200 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-500">Country:</span>
                  <span className="font-bold text-gray-900">{selectedSubmissionForView.countryFlag} {selectedSubmissionForView.countryName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">ID Document:</span>
                  <span className="font-bold text-gray-900 truncate max-w-[200px]">{selectedSubmissionForView.idFileName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Submitted:</span>
                  <span className="font-bold text-gray-900">{selectedSubmissionForView.submittedAt}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Status:</span>
                  <span className="font-bold text-indigo-700">{selectedSubmissionForView.status}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => {
                  if (soundEnabled) playClickSound();
                  setSubSubmissions(prev => prev.map(s => s.id === selectedSubmissionForView.id ? { ...s, status: 'Approved' } : s));
                  setSelectedSubmissionForView(prev => prev ? { ...prev, status: 'Approved' } : null);
                }}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition"
              >
                Approve
              </button>
              <button
                type="button"
                onClick={() => {
                  if (soundEnabled) playClickSound();
                  setSubSubmissions(prev => prev.map(s => s.id === selectedSubmissionForView.id ? { ...s, status: 'Rejected' } : s));
                  setSelectedSubmissionForView(prev => prev ? { ...prev, status: 'Rejected' } : null);
                }}
                className="flex-1 py-2.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-xl text-xs font-bold transition"
              >
                Reject
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW REFERRAL DETAILS MODAL */}
      {selectedReferralForView && (
        <div className="fixed inset-0 z-[10100] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 pointer-events-auto">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 space-y-5 relative">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => {
                  if (soundEnabled) playClickSound();
                  setSelectedReferralForView(null);
                }}
                aria-label="Back"
                title="Back"
                className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 hover:text-gray-900 transition shrink-0"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-indigo-600 text-white font-bold text-lg flex items-center justify-center shadow-md shrink-0">
                {selectedReferralForView.username.charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 className="font-bold text-lg text-gray-900">{selectedReferralForView.username}</h3>
                <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                  selectedReferralForView.status === 'Approved'
                    ? 'bg-green-100 text-green-700'
                    : selectedReferralForView.status === 'Frozen'
                    ? 'bg-cyan-100 text-cyan-800'
                    : selectedReferralForView.status === 'Rejected'
                    ? 'bg-red-100 text-red-700'
                    : 'bg-amber-100 text-amber-700'
                }`}>
                  {selectedReferralForView.status}
                </span>
              </div>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-gray-200/60">
                <span className="text-gray-500">Tenant Referral Code</span>
                <span className="font-mono font-bold text-gray-800">{selectedReferralForView.tenantCode}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-200/60">
                <span className="text-gray-500">30-Day App Free Trial</span>
                <span className="font-bold text-indigo-600">
                  {getReferralTrialInfo(selectedReferralForView).daysLeft} days left (Ends {getReferralTrialInfo(selectedReferralForView).endsDateStr})
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-200/60">
                <span className="text-gray-500">Country</span>
                <span className="font-bold text-gray-800">
                  {selectedReferralForView.countryFlag || selectedCountry.flag} {selectedReferralForView.countryName || selectedCountry.country}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-200/60">
                <span className="text-gray-500">Earning Eligibility</span>
                <span className={`font-bold ${isReferralSameCountry(selectedReferralForView) ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {isReferralSameCountry(selectedReferralForView)
                    ? `Eligible (${selectedCountry.country})`
                    : `Blocked — Outside ${selectedCountry.country}`}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-200/60">
                <span className="text-gray-500">Joined Date</span>
                <span className="font-bold text-gray-800">{selectedReferralForView.joinedDate}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-200/60">
                <span className="text-gray-500">Total Commissions Generated</span>
                <span className={`font-bold ${isReferralSameCountry(selectedReferralForView) ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {formatCurrency(getReferralEffectiveCommissionUsd(selectedReferralForView), selectedCountry)}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-200/60">
                <span className="text-gray-500">Completed Gigs / Activities</span>
                <span className="font-bold text-gray-800">{selectedReferralForView.activitiesCount || 0}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-gray-500">Last Active</span>
                <span className="font-bold text-gray-800">{selectedReferralForView.lastActive || 'Today'}</span>
              </div>
            </div>

            {selectedReferralForView.status === 'Frozen' && (
              <div className="p-3 bg-cyan-50 border border-cyan-300 rounded-2xl text-xs text-cyan-900 space-y-1">
                <div className="font-bold flex items-center space-x-1 text-cyan-800">
                  <ShieldAlert className="w-4 h-4 text-cyan-600" />
                  <span>Rule Violation & Account Frozen</span>
                </div>
                <p className="text-[11px] text-cyan-800 leading-relaxed">
                  {selectedReferralForView.freezeReason || 'Rule violation: Failure to follow platform standards.'}
                </p>
              </div>
            )}

            {/* Quick Actions inside detail view */}
            <div className="flex items-center space-x-2 pt-2">
              {selectedReferralForView.status !== 'Approved' && (
                <button
                  onClick={() => handleApproveReferral(selectedReferralForView.id)}
                  className="flex-1 py-3 bg-green-600 hover:bg-green-700 text-white rounded-2xl font-bold text-xs shadow-md transition"
                >
                  Approve Referral
                </button>
              )}

              {selectedReferralForView.status === 'Frozen' ? (
                <button
                  onClick={() => handleUnfreezeReferral(selectedReferralForView.id)}
                  className="flex-1 py-3 bg-cyan-600 hover:bg-cyan-700 text-white rounded-2xl font-bold text-xs shadow-md transition"
                >
                  Unfreeze Account
                </button>
              ) : (
                <button
                  onClick={() => handleOpenFreezeModal(selectedReferralForView)}
                  className="flex-1 py-3 bg-cyan-50 hover:bg-cyan-100 text-cyan-800 border border-cyan-300 rounded-2xl font-bold text-xs transition"
                >
                  Freeze Account
                </button>
              )}

              {selectedReferralForView.status !== 'Rejected' && (
                <button
                  onClick={() => handleRejectReferral(selectedReferralForView.id)}
                  className="py-3 px-4 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-2xl font-bold text-xs transition"
                >
                  Reject
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* FREEZE REFERRAL ACCOUNT MODAL */}
      {freezeModalOpen && referralToFreeze && (
        <div className="fixed inset-0 z-[10150] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 pointer-events-auto">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 space-y-4 relative">
            <div className="flex items-start space-x-3">
              <button
                onClick={() => {
                  if (soundEnabled) playClickSound();
                  setFreezeModalOpen(false);
                  setReferralToFreeze(null);
                }}
                aria-label="Back"
                title="Back"
                className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 hover:text-gray-900 transition shrink-0 mt-0.5"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="space-y-1">
                <h3 className="font-bold text-lg text-gray-900 flex items-center space-x-2">
                  <Snowflake className="w-5 h-5 text-cyan-600" />
                  <span>Freeze Account: {referralToFreeze.username}</span>
                </h3>
                <p className="text-xs text-gray-500">
                  Freeze this account if the referral violates community rules or safety policies.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-gray-700">Violation Reason / Rule Broken</label>
              <textarea
                value={freezeReasonInput}
                onChange={e => setFreezeReasonInput(e.target.value)}
                rows={3}
                placeholder="e.g. Non-compliance with safety regulations or unauthorized spam."
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-2xl text-xs focus:outline-none focus:border-cyan-600"
              />
            </div>

            <div className="flex space-x-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  if (soundEnabled) playClickSound();
                  setFreezeModalOpen(false);
                  setReferralToFreeze(null);
                }}
                className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-2xl font-bold text-xs transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmFreeze}
                className="flex-1 py-3 bg-cyan-600 hover:bg-cyan-700 text-white rounded-2xl font-bold text-xs shadow-md transition flex items-center justify-center space-x-1.5"
              >
                <Snowflake className="w-3.5 h-3.5" />
                <span>Confirm Freeze</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================== */}
      {/* UPGRADE MODAL WITH 2 CHRISTMAS BOXES & VERIFICATION FLOW */}
      {/* ========================================================== */}
      {upgradeModalOpen && (
        <div className="fixed inset-0 z-[10200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 pointer-events-auto overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl max-w-xl w-full p-6 sm:p-8 space-y-6 relative my-auto overflow-hidden">
            <FloatingToolsBackdrop count={10} />
            <button
              onClick={() => {
                if (soundEnabled) playClickSound();
                if (verificationStep === 'capture') {
                  stopMediaStream();
                  setVerificationStep('boxes');
                  setSelectedSubPlan(null);
                  return;
                }
                setUpgradeModalOpen(false);
                setVerificationStep('boxes');
                setSelectedSubPlan(null);
                setSelfieImage(null);
                setIdDocumentFile(null);
                stopMediaStream();
              }}
              aria-label="Back"
              title="Back"
              className="absolute top-5 left-5 p-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 hover:text-gray-900 transition z-20"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            {/* STEP 1: CHRISTMAS GIFT BOXES */}
            {verificationStep === 'boxes' && (
              <div className="space-y-6 text-center relative z-10">
                <div className="space-y-2">
                  <div className="w-14 h-14 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
                    <Crown className="w-7 h-7" />
                  </div>
                  <h3 className="font-extrabold text-2xl text-gray-900">Choose Your Subscription</h3>
                  <p className="text-xs text-gray-500">
                    Select a holiday subscription box below to begin verification ({selectedCountry.flag} {selectedCountry.currencyCode}).
                  </p>
                  <div className="inline-flex items-center space-x-1.5 px-3 py-1 bg-indigo-50 border border-indigo-200 rounded-full text-[11px] font-bold text-indigo-700">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                    <span>
                      {userTrialDaysLeft > 0
                        ? `30-Day Referral Trial Active (${userTrialDaysLeft} days left)`
                        : 'All referrals using the app receive a 30-day free trial'}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  {/* BOX 1: TENANT SUB */}
                  <div
                    onClick={() => {
                      if (soundEnabled) playClickSound();
                      setSelectedSubPlan('tenant');
                      setVerificationStep('capture');
                    }}
                    className="group cursor-pointer bg-gradient-to-b from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white rounded-3xl p-6 shadow-xl border-4 border-yellow-300 transition transform hover:-translate-y-1 relative overflow-hidden flex flex-col items-center text-center"
                  >
                    <div className="absolute inset-x-0 top-0 h-4 bg-yellow-300 opacity-80" />
                    <div className="absolute inset-y-0 left-1/2 w-4 -translate-x-1/2 bg-yellow-300 opacity-80" />

                    <div className="relative z-10 space-y-2.5 pt-3">
                      <span className="bg-yellow-300 text-red-900 text-[10px] font-black uppercase px-3 py-1 rounded-full shadow-xs">
                        🎄 Gift Box 1
                      </span>
                      <h4 className="font-black text-xl text-white">Tenant Sub</h4>
                      <div className="text-lg font-black text-yellow-200">
                        {formatCurrency(tenantSubFeeUsd, selectedCountry)}/mo
                      </div>
                      <p className="text-xs text-red-100 leading-relaxed">
                        Full admin workspace, branch dashboards & custom map layers.
                      </p>
                      <div className="pt-1 text-sm font-black underline">Select Tenant Box</div>
                    </div>
                  </div>

                  {/* BOX 2: USER SUB */}
                  <div
                    onClick={() => {
                      if (soundEnabled) playClickSound();
                      setSelectedSubPlan('user');
                      setVerificationStep('capture');
                    }}
                    className="group cursor-pointer bg-gradient-to-b from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white rounded-3xl p-6 shadow-xl border-4 border-yellow-300 transition transform hover:-translate-y-1 relative overflow-hidden flex flex-col items-center text-center"
                  >
                    <div className="absolute inset-x-0 top-0 h-4 bg-yellow-300 opacity-80" />
                    <div className="absolute inset-y-0 left-1/2 w-4 -translate-x-1/2 bg-yellow-300 opacity-80" />

                    <div className="relative z-10 space-y-2.5 pt-3">
                      <span className="bg-yellow-300 text-green-900 text-[10px] font-black uppercase px-3 py-1 rounded-full shadow-xs">
                        🎁 Gift Box 2
                      </span>
                      <h4 className="font-black text-xl text-white">User Sub</h4>
                      <div className="text-lg font-black text-yellow-200">
                        {formatCurrency(userSubFeeUsd, selectedCountry)}/mo
                      </div>
                      <p className="text-xs text-green-100 leading-relaxed">
                        Unlimited gigs, Seekers, Referrals, Settings & Upgrade tools.
                      </p>
                      <div className="pt-1 text-sm font-black underline">Select User Box</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2: CAPTURE LIVE FACE SELFIE & UPLOAD ID */}
            {verificationStep === 'capture' && (
              <div className="space-y-5">
                <div className="text-center space-y-1">
                  <h3 className="font-bold text-xl text-gray-900">Identity Verification</h3>
                  <p className="text-xs text-gray-500">Required for activating {selectedSubPlan === 'tenant' ? 'Tenant Sub' : 'User Sub'}.</p>
                </div>

                {/* Live Selfie Capture Section */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="block text-xs font-bold text-gray-700">1. Capture Live Face Selfie</label>
                    {selfieImage && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelfieImage(null);
                          setCameraPermissionError(null);
                        }}
                        className="text-[10px] text-blue-600 font-bold hover:underline"
                      >
                        Retake Selfie
                      </button>
                    )}
                  </div>
                  <div className="relative w-full h-52 bg-gray-950 rounded-2xl overflow-hidden flex flex-col items-center justify-center border-2 border-gray-300 p-4 text-center shadow-inner">
                    {selfieImage ? (
                      <div className="relative w-full h-full">
                        <img src={selfieImage} alt="Selfie" className="w-full h-full object-cover rounded-xl" />
                        <div className="absolute top-2.5 right-2.5 bg-emerald-600/90 text-white text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center space-x-1 shadow-md">
                          <Check className="w-3 h-3 stroke-[3]" />
                          <span>Selfie Ready</span>
                        </div>
                      </div>
                    ) : webcamActive ? (
                      <div className="relative w-full h-full">
                        <video
                          ref={(el) => {
                            webcamRef.current = el;
                            if (el && mediaStreamRef.current && el.srcObject !== mediaStreamRef.current) {
                              el.srcObject = mediaStreamRef.current;
                              el.play().catch(err => console.log('Video play error:', err));
                            }
                          }}
                          autoPlay
                          playsInline
                          muted
                          className="w-full h-full object-cover rounded-xl transform -scale-x-100"
                        />
                        <div className="absolute bottom-3 inset-x-0 flex items-center justify-center space-x-2 z-20">
                          <button
                            type="button"
                            onClick={captureSelfie}
                            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full text-xs font-bold shadow-xl flex items-center space-x-2 border-2 border-white transition transform active:scale-95"
                          >
                            <Camera className="w-4 h-4" />
                            <span>Snap Selfie Now</span>
                          </button>
                          <button
                            type="button"
                            onClick={stopMediaStream}
                            className="px-3 py-2 bg-gray-800/80 hover:bg-gray-700 text-white rounded-full text-xs font-medium backdrop-blur-xs transition"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3 z-10 max-w-sm px-1">
                        <div className="w-11 h-11 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-full flex items-center justify-center mx-auto shadow-sm">
                          <Camera className="w-5 h-5 text-blue-300" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-white">Live Face Selfie Access</p>
                          <p className="text-[10px] text-gray-300 mt-0.5">Use your live web camera or tap Device Camera</p>
                        </div>

                        {cameraPermissionError && (
                          <div className="p-2.5 bg-amber-950/80 border border-amber-500/40 rounded-xl text-left">
                            <p className="text-[10px] text-amber-200 leading-tight">{cameraPermissionError}</p>
                          </div>
                        )}

                        <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                          <button
                            type="button"
                            onClick={startWebcam}
                            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-lg transition flex items-center space-x-1.5 active:scale-95"
                          >
                            <Camera className="w-3.5 h-3.5" />
                            <span>{cameraPermissionError ? 'Retry Live Camera' : 'Start Live Camera'}</span>
                          </button>

                          <label className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-lg transition cursor-pointer flex items-center space-x-1.5 active:scale-95">
                            <Camera className="w-3.5 h-3.5" />
                            <span>Device Camera</span>
                            <input
                              type="file"
                              accept="image/*"
                              capture="user"
                              onChange={handleSelfieFile}
                              className="hidden"
                            />
                          </label>

                          <label className="px-3.5 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-xl text-xs font-bold shadow-lg transition cursor-pointer flex items-center space-x-1.5 active:scale-95">
                            <Upload className="w-3.5 h-3.5" />
                            <span>Upload Photo</span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleSelfieFile}
                              className="hidden"
                            />
                          </label>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* ID Document Upload Section */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-gray-700">2. Upload ID Document from Device</label>
                  <div className="flex items-center space-x-2">
                    <label className="flex-1 flex items-center justify-center px-4 py-3 bg-gray-50 hover:bg-gray-100 border-2 border-dashed border-gray-300 rounded-2xl cursor-pointer text-xs text-gray-600 font-medium transition">
                      <Upload className="w-4 h-4 mr-2 text-gray-500" />
                      <span className="truncate">{idDocumentFile ? idDocumentFile.name : 'Choose ID file (Passport, License)'}</span>
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        onChange={e => {
                          if (e.target.files && e.target.files[0]) {
                            setIdDocumentFile(e.target.files[0]);
                          }
                        }}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={!selfieImage || !idDocumentFile}
                  onClick={() => {
                    if (soundEnabled) playClickSound();
                    if (selectedSubPlan) {
                      const submission: SubSubmissionItem = {
                        id: `sub-${Date.now()}`,
                        email: userLoggedIn || userProfile.email || 'applicant@geo-osm.app',
                        plan: selectedSubPlan,
                        selfieImage,
                        idFileName: idDocumentFile ? idDocumentFile.name : 'ID_Document',
                        countryCode: selectedCountry.code,
                        countryName: selectedCountry.country,
                        countryFlag: selectedCountry.flag,
                        submittedAt: new Date().toISOString().split('T')[0],
                        status: 'Pending'
                      };
                      setSubSubmissions(prev => [submission, ...prev]);
                    }
                    setVerificationStep('review');
                    setReviewSecondsLeft(20);
                  }}
                  className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-2xl font-bold text-sm transition shadow-lg"
                >
                  Submit for Verification
                </button>
              </div>
            )}

            {/* STEP 3: REVIEW TAKES 15-25 SECONDS */}
            {verificationStep === 'review' && (
              <div className="space-y-6 text-center py-6">
                <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
                  <div className="absolute inset-0 border-4 border-blue-200 rounded-full animate-ping" />
                  <div className="w-16 h-16 bg-blue-600 text-white rounded-full flex items-center justify-center shadow-xl">
                    <Loader2 className="w-8 h-8 animate-spin" />
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="font-bold text-xl text-gray-900">Reviewing Verification...</h3>
                  <p className="text-xs text-gray-500 max-w-xs mx-auto">
                    Our compliance system is reviewing your live selfie and ID documents. Please wait ~{reviewSecondsLeft} seconds.
                  </p>
                </div>

                <div className="w-full bg-gray-200 h-3 rounded-full overflow-hidden max-w-xs mx-auto">
                  <div
                    className="bg-blue-600 h-full transition-all duration-1000"
                    style={{ width: `${((20 - reviewSecondsLeft) / 20) * 100}%` }}
                  />
                </div>
              </div>
            )}

            {/* STEP 4: SUCCESS */}
            {verificationStep === 'success' && (
              <div className="space-y-6 text-center py-6">
                <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                  <ShieldCheck className="w-8 h-8" />
                </div>

                <div className="space-y-2">
                  <h3 className="font-bold text-2xl text-gray-900">Subscription Activated!</h3>
                  <p className="text-xs text-gray-600 max-w-xs mx-auto">
                    {selectedSubPlan === 'tenant'
                      ? 'Tenant Sub is now active! Access your Tenant dash in the menu.'
                      : 'User Sub is now active! Your menu has been streamlined to your exclusive features.'}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (soundEnabled) playClickSound();
                    setUpgradeModalOpen(false);
                    setVerificationStep('boxes');
                    setSelectedSubPlan(null);
                  }}
                  className="w-full py-3.5 bg-green-600 hover:bg-green-700 text-white rounded-2xl font-bold text-sm transition shadow-lg"
                >
                  Got It, Continue
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {settingsModalOpen && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 pointer-events-auto">
          <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-6 space-y-5 relative overflow-hidden">
            <FloatingToolsBackdrop count={7} />
            <div className="relative z-10 flex items-start space-x-3">
              <button
                onClick={() => {
                  if (soundEnabled) playClickSound();
                  setSettingsModalOpen(false);
                }}
                aria-label="Back"
                title="Back"
                className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 hover:text-gray-900 transition shrink-0"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h3 className="font-bold text-xl text-gray-900 flex items-center space-x-2">
                  <Settings className="w-5 h-5 text-gray-700" />
                  <span>App Settings</span>
                </h3>
                <p className="text-xs text-gray-500 mt-1">Configure your map experience & currency</p>
              </div>
            </div>

            <div className="relative z-10 space-y-3">
              <div className="flex items-center justify-between p-3 bg-gray-50/90 border border-gray-200 rounded-2xl">
                <div>
                  <h5 className="font-semibold text-xs text-gray-900">Button Click Sound</h5>
                  <p className="text-[10px] text-gray-500">Play audio beep on clicks</p>
                </div>
                <input
                  type="checkbox"
                  checked={soundEnabled}
                  onChange={e => {
                    setSoundEnabled(e.target.checked);
                    if (e.target.checked) playClickSound();
                  }}
                  className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-emerald-50/80 border border-emerald-200 rounded-2xl">
                <div>
                  <h5 className="font-semibold text-xs text-gray-900">Country & Currency</h5>
                  <p className="text-[10px] text-emerald-700 font-medium">
                    {selectedCountry.flag} {selectedCountry.country} ({selectedCountry.currencyCode} {selectedCountry.symbol.trim()})
                  </p>
                </div>
                {countryLocked ? (
                  <span className="px-3 py-1.5 bg-emerald-100 text-emerald-800 rounded-xl text-xs font-bold flex items-center space-x-1">
                    <Lock className="w-3 h-3" />
                    <span>Locked</span>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      if (soundEnabled) playClickSound();
                      setSettingsModalOpen(false);
                      setCountryModalOpen(true);
                    }}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition"
                  >
                    Select
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Profile Modal */}
      {profileModalOpen && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto pointer-events-auto">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full max-h-[92vh] overflow-y-auto p-6 space-y-5 relative border border-gray-100 overflow-x-hidden">
            <FloatingToolsBackdrop count={10} />
            {/* Header with Back Button */}
            <div className="relative z-10 flex items-start space-x-3">
              <button
                onClick={() => {
                  if (soundEnabled) playClickSound();
                  stopProfileMediaStream();
                  setProfileModalOpen(false);
                }}
                aria-label="Back"
                title="Back"
                className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 hover:text-gray-900 transition shrink-0"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h3 className="font-bold text-xl text-gray-900 flex items-center space-x-2">
                  <UserCircle className="w-6 h-6 text-indigo-600" />
                  <span>User Profile</span>
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                  Your face selfie, personal contact info, and live map location
                </p>
              </div>
            </div>

            {/* Success Toast */}
            {profileSavedToast && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center space-x-2 text-emerald-800 text-xs font-semibold animate-in fade-in duration-200">
                <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>Profile updated & face selfie synced to your map location!</span>
              </div>
            )}

            {/* User Gig Star Ratings Section */}
            {(() => {
              const profileEmailKey = (userLoggedIn || userProfile.email || '').trim().toLowerCase();
              const combinedMap = new Map<string, GigRating>();
              (userProfile.ratings || []).forEach(r => combinedMap.set(r.id, r));
              (userRatingsMap[profileEmailKey] || []).forEach(r => combinedMap.set(r.id, r));
              const profileRatings = Array.from(combinedMap.values());
              const avgRating = profileRatings.length > 0
                ? (profileRatings.reduce((acc, r) => acc + r.rating, 0) / profileRatings.length).toFixed(1)
                : null;

              return (
                <div className="relative z-10 bg-amber-50/70 border border-amber-200 rounded-2xl p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-950 flex items-center space-x-1.5">
                      <Star className="w-4 h-4 fill-amber-400 text-amber-500" />
                      <span>Completed Gig Ratings</span>
                    </span>
                    <span className="text-xs font-black text-amber-800 bg-white px-2.5 py-0.5 rounded-full border border-amber-200">
                      {avgRating ? `★ ${avgRating} (${profileRatings.length})` : 'No ratings yet'}
                    </span>
                  </div>
                  {profileRatings.length > 0 && (
                    <div className="space-y-1.5 max-h-28 overflow-y-auto pr-1">
                      {profileRatings.map(r => (
                        <div key={r.id} className="bg-white/90 rounded-xl px-3 py-2 border border-amber-100 flex items-center justify-between gap-2 text-xs">
                          <div className="min-w-0">
                            <p className="font-bold text-gray-900 truncate">{r.gigTitle}</p>
                            <p className="text-[10px] text-gray-500 truncate">
                              By {r.ratedBy} • {r.ratedAt}{r.comment ? ` • "${r.comment}"` : ''}
                            </p>
                          </div>
                          <div className="flex items-center space-x-0.5 shrink-0">
                            {Array.from({ length: 5 }).map((_, idx) => (
                              <Star
                                key={idx}
                                className={`w-3.5 h-3.5 ${
                                  idx < r.rating ? 'fill-amber-400 text-amber-500' : 'text-gray-300'
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Face Selfie Section */}
            <div className="bg-gradient-to-b from-indigo-50/60 to-purple-50/40 p-4 rounded-3xl border border-indigo-100 text-center space-y-3">
              <span className="text-[11px] font-bold text-indigo-900 uppercase tracking-wider block">
                Face Selfie (Visible on Map)
              </span>

              {/* Live Webcam Preview or Photo Display */}
              {profileWebcamActive ? (
                <div className="space-y-3">
                  <div className="relative w-44 h-44 mx-auto rounded-full overflow-hidden border-4 border-indigo-500 shadow-xl bg-black">
                    <video
                      ref={profileWebcamRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover scale-x-[-1]"
                    />
                    <div className="absolute inset-0 border-2 border-dashed border-white/50 rounded-full pointer-events-none" />
                  </div>
                  <div className="flex items-center justify-center space-x-2">
                    <button
                      type="button"
                      onClick={captureProfileSelfie}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs shadow-md flex items-center space-x-1.5 transition"
                    >
                      <Camera className="w-4 h-4" />
                      <span>Capture Selfie</span>
                    </button>
                    <button
                      type="button"
                      onClick={stopProfileMediaStream}
                      className="px-3 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-xl font-semibold text-xs transition"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="relative w-28 h-28 mx-auto rounded-full p-1 bg-gradient-to-tr from-indigo-500 via-purple-500 to-amber-400 shadow-xl border-2 border-white overflow-hidden group">
                    {userProfile.selfieImage ? (
                      <img
                        src={userProfile.selfieImage}
                        alt="User Face Selfie"
                        className="w-full h-full object-cover rounded-full"
                      />
                    ) : (
                      <div className="w-full h-full bg-indigo-100 rounded-full flex items-center justify-center text-indigo-400">
                        <UserCircle className="w-16 h-16" />
                      </div>
                    )}
                    <div className="absolute bottom-1 right-1 w-5 h-5 bg-emerald-500 border-2 border-white rounded-full flex items-center justify-center text-white text-[9px] font-bold shadow-xs">
                      ✓
                    </div>
                  </div>

                  {profileCameraError && (
                    <p className="text-[11px] text-amber-700 bg-amber-50 p-2 rounded-xl border border-amber-200 max-w-sm mx-auto">
                      {profileCameraError}
                    </p>
                  )}

                  {/* Buttons for Camera / Upload */}
                  <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        if (soundEnabled) playClickSound();
                        startProfileWebcam();
                      }}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-xs flex items-center space-x-1.5 transition"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>Live Camera</span>
                    </button>

                    <label className="cursor-pointer px-3 py-1.5 bg-white hover:bg-gray-50 border border-gray-300 text-gray-800 text-xs font-semibold rounded-xl shadow-xs flex items-center space-x-1.5 transition">
                      <Camera className="w-3.5 h-3.5 text-blue-600" />
                      <span>Device Camera</span>
                      <input
                        type="file"
                        accept="image/*"
                        capture="user"
                        onChange={handleProfileSelfieFile}
                        className="hidden"
                      />
                    </label>

                    <label className="cursor-pointer px-3 py-1.5 bg-white hover:bg-gray-50 border border-gray-300 text-gray-800 text-xs font-semibold rounded-xl shadow-xs flex items-center space-x-1.5 transition">
                      <Upload className="w-3.5 h-3.5 text-gray-600" />
                      <span>Upload Photo</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleProfileSelfieFile}
                        className="hidden"
                      />
                    </label>

                    {userProfile.selfieImage && (
                      <button
                        type="button"
                        onClick={() => {
                          if (soundEnabled) playClickSound();
                          setUserProfile(prev => ({ ...prev, selfieImage: null }));
                          setSelfieImage(null);
                        }}
                        className="px-2.5 py-1.5 text-red-600 hover:bg-red-50 border border-red-200 text-xs font-semibold rounded-xl transition flex items-center space-x-1"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Remove</span>
                      </button>
                    )}
                  </div>
                  <p className="text-[10px] text-gray-500">
                    Your face selfie displays inside your map marker pin at your exact coordinates.
                  </p>
                </div>
              )}
            </div>

            {/* Profile Form */}
            <form onSubmit={handleSaveProfile} className="space-y-4">
              {/* Name and Surname */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Name</label>
                  <input
                    type="text"
                    required
                    placeholder="First Name"
                    value={userProfile.name}
                    onChange={e => setUserProfile(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3.5 py-2.5 border-2 border-gray-200 rounded-2xl text-sm focus:outline-none focus:border-indigo-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Surname</label>
                  <input
                    type="text"
                    required
                    placeholder="Surname"
                    value={userProfile.surname}
                    onChange={e => setUserProfile(prev => ({ ...prev, surname: e.target.value }))}
                    className="w-full px-3.5 py-2.5 border-2 border-gray-200 rounded-2xl text-sm focus:outline-none focus:border-indigo-600"
                  />
                </div>
              </div>

              {/* Location with Auto-Set Feature */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-semibold text-gray-700 flex items-center space-x-1.5">
                    <MapPin className="w-3.5 h-3.5 text-blue-600" />
                    <span>Location</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleSetLocationAutomatically}
                    disabled={isLocatingProfile}
                    className="text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2.5 py-1 rounded-xl flex items-center space-x-1 transition shadow-xs disabled:opacity-50"
                  >
                    {isLocatingProfile ? (
                      <Loader2 className="w-3 h-3 animate-spin text-blue-600" />
                    ) : (
                      <Navigation className="w-3 h-3 text-blue-600" />
                    )}
                    <span>{isLocatingProfile ? 'Detecting...' : 'Set Location Automatically'}</span>
                  </button>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="e.g. Central London, UK or street address"
                    value={userProfile.location}
                    onChange={e => setUserProfile(prev => ({ ...prev, location: e.target.value }))}
                    className="w-full px-3.5 py-2.5 border-2 border-gray-200 rounded-2xl text-sm focus:outline-none focus:border-indigo-600"
                  />
                </div>
                {userProfile.lat && userProfile.lng && (
                  <p className="text-[10px] text-gray-400 mt-1 flex items-center space-x-1">
                    <span>GPS Coordinates: {userProfile.lat.toFixed(5)}, {userProfile.lng.toFixed(5)}</span>
                  </p>
                )}
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1 flex items-center space-x-1.5">
                  <Mail className="w-3.5 h-3.5 text-gray-500" />
                  <span>Email</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="name@example.com"
                  value={userProfile.email}
                  onChange={e => setUserProfile(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full px-3.5 py-2.5 border-2 border-gray-200 rounded-2xl text-sm focus:outline-none focus:border-indigo-600"
                />
              </div>

              {/* Contact Information (Phone / Mobile) */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1 flex items-center space-x-1.5">
                  <Phone className="w-3.5 h-3.5 text-gray-500" />
                  <span>Contact Information</span>
                </label>
                <input
                  type="tel"
                  placeholder="+44 7911 123456 / Mobile"
                  value={userProfile.phone}
                  onChange={e => setUserProfile(prev => ({ ...prev, phone: e.target.value }))}
                  className="w-full px-3.5 py-2.5 border-2 border-gray-200 rounded-2xl text-sm focus:outline-none focus:border-indigo-600"
                />
              </div>

              {/* Social Media Links (Add More Optional) */}
              <div className="space-y-2 pt-1 border-t border-gray-100">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-semibold text-gray-700 flex items-center space-x-1.5">
                    <LinkIcon className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Social Media Links</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleAddSocialLink}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-2.5 py-1 rounded-xl flex items-center space-x-1 transition shadow-xs"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Link</span>
                  </button>
                </div>

                {userProfile.socialLinks.length === 0 ? (
                  <div className="p-3 bg-gray-50 border border-dashed border-gray-200 rounded-2xl text-center text-xs text-gray-500">
                    No social media links added yet. Click "+ Add Link" to add your profiles.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                    {userProfile.socialLinks.map((link) => (
                      <div key={link.id} className="flex items-center space-x-2 bg-gray-50 p-2 rounded-2xl border border-gray-200">
                        <select
                          value={link.platform}
                          onChange={e => handleUpdateSocialLink(link.id, 'platform', e.target.value)}
                          className="text-xs font-semibold bg-white border border-gray-200 rounded-xl px-2 py-1.5 text-gray-700 focus:outline-none focus:border-indigo-500"
                        >
                          <option value="LinkedIn">LinkedIn</option>
                          <option value="Twitter / X">Twitter / X</option>
                          <option value="Instagram">Instagram</option>
                          <option value="Facebook">Facebook</option>
                          <option value="GitHub">GitHub</option>
                          <option value="YouTube">YouTube</option>
                          <option value="TikTok">TikTok</option>
                          <option value="Website">Website</option>
                        </select>
                        <input
                          type="url"
                          placeholder="https://..."
                          value={link.url}
                          onChange={e => handleUpdateSocialLink(link.id, 'url', e.target.value)}
                          className="flex-1 px-3 py-1.5 text-xs bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-indigo-500"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveSocialLink(link.id)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                          title="Remove Link"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Register as Live Seeker Section (Real Users) */}
              <div className="space-y-2 pt-2 border-t border-gray-100">
                <label className="text-xs font-semibold text-gray-700 flex items-center space-x-1.5">
                  <Users className="w-3.5 h-3.5 text-green-600" />
                  <span>Become a Seeker (Optional)</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Your skill (e.g. Delivery, Design)"
                    value={registerSeekerSkill}
                    onChange={e => setRegisterSeekerSkill(e.target.value)}
                    className="w-full px-3.5 py-2 border-2 border-gray-200 rounded-2xl text-xs focus:outline-none focus:border-green-600"
                  />
                  <input
                    type="text"
                    placeholder={`Hourly rate (${selectedCountry.symbol.trim()})`}
                    value={registerSeekerRate}
                    onChange={e => setRegisterSeekerRate(e.target.value)}
                    className="w-full px-3.5 py-2 border-2 border-gray-200 rounded-2xl text-xs focus:outline-none focus:border-green-600"
                  />
                </div>
              </div>

              {/* Submit / Save Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white rounded-2xl font-bold text-sm shadow-xl transition transform active:scale-98 flex items-center justify-center space-x-2"
                >
                  <Check className="w-4 h-4" />
                  <span>Save Profile & Update Map Location</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Gig Modal */}
      {createGigModal && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 pointer-events-auto">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 space-y-4 relative overflow-hidden">
            <FloatingToolsBackdrop compact count={7} />
            <div className="flex items-center space-x-3 relative z-10">
              <button
                onClick={() => {
                  if (soundEnabled) playClickSound();
                  setCreateGigModal(false);
                }}
                aria-label="Back"
                title="Back"
                className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 hover:text-gray-900 transition shrink-0"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h3 className="font-bold text-xl text-gray-900 flex items-center space-x-2">
                <Briefcase className="w-5 h-5 text-blue-600" />
                <span>Create New Gig</span>
              </h3>
            </div>
            <form onSubmit={handleCreateGigSubmit} className="space-y-3 relative z-10">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Gig Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Local Delivery / Web Design"
                  value={gigTitle}
                  onChange={e => setGigTitle(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-2xl text-sm focus:outline-none focus:border-blue-600 bg-white/90"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  required
                  placeholder="Details about the gig..."
                  value={gigDesc}
                  onChange={e => setGigDesc(e.target.value)}
                  rows={2}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-2xl text-sm focus:outline-none focus:border-blue-600 bg-white/90"
                />
              </div>
              <div className="relative">
                <label className="block text-xs font-medium text-gray-700 mb-1 flex items-center justify-between">
                  <span>Gig Location</span>
                  {gigSelectedCoords && (
                    <span className="text-[10px] font-bold text-emerald-600">Location selected</span>
                  )}
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3.5 top-3.5 w-4 h-4 text-blue-600" />
                  <input
                    type="text"
                    placeholder="Type street, area, or city for suggestions..."
                    value={gigLocationQuery}
                    onChange={e => {
                      setGigLocationQuery(e.target.value);
                      setGigSelectedCoords(null);
                    }}
                    className="w-full pl-10 pr-10 py-3 border-2 border-gray-200 rounded-2xl text-sm focus:outline-none focus:border-blue-600 bg-white/90"
                  />
                  {isSearchingGigLocation && (
                    <Loader2 className="absolute right-3.5 top-3.5 w-4 h-4 text-blue-600 animate-spin" />
                  )}
                </div>
                {gigLocationResults.length > 0 && (
                  <div className="mt-1.5 max-h-36 overflow-y-auto bg-white border-2 border-blue-200 rounded-2xl shadow-xl divide-y divide-gray-100">
                    {gigLocationResults.map(item => (
                      <button
                        key={item.place_id}
                        type="button"
                        onClick={() => {
                          if (soundEnabled) playClickSound();
                          gigLocationJustPickedRef.current = true;
                          setGigLocationQuery(item.display_name);
                          setGigSelectedCoords({ lat: parseFloat(item.lat), lng: parseFloat(item.lon) });
                          setGigLocationResults([]);
                        }}
                        className="w-full text-left px-3 py-2 text-xs text-gray-800 hover:bg-blue-50 flex items-center space-x-2 transition"
                      >
                        <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        <span className="truncate">{item.display_name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Budget ({selectedCountry.flag} {selectedCountry.currencyCode} {selectedCountry.symbol.trim()})
                </label>
                <input
                  type="text"
                  placeholder={`e.g. ${formatCurrency(250, selectedCountry, 0)}`}
                  value={gigBudget}
                  onChange={e => setGigBudget(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-2xl text-sm focus:outline-none focus:border-blue-600 bg-white/90"
                />
              </div>

              {/* Schedule: Immediately or Set Date & Time */}
              <div className="space-y-2">
                <label className="block text-xs font-medium text-gray-700">When should this gig start?</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (soundEnabled) playClickSound();
                      setGigScheduleType('immediate');
                    }}
                    className={`py-2.5 px-3 rounded-2xl border-2 text-xs font-bold flex items-center justify-center space-x-1.5 transition ${
                      gigScheduleType === 'immediate'
                        ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                        : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Immediately</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (soundEnabled) playClickSound();
                      setGigScheduleType('scheduled');
                    }}
                    className={`py-2.5 px-3 rounded-2xl border-2 text-xs font-bold flex items-center justify-center space-x-1.5 transition ${
                      gigScheduleType === 'scheduled'
                        ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm'
                        : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Set Date & Time</span>
                  </button>
                </div>

                {gigScheduleType === 'scheduled' && (
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div>
                      <label className="block text-[10px] font-semibold text-gray-500 mb-1 flex items-center space-x-1">
                        <Calendar className="w-3 h-3 text-indigo-600" />
                        <span>Date</span>
                      </label>
                      <input
                        type="date"
                        required
                        value={gigScheduledDate}
                        onChange={e => setGigScheduledDate(e.target.value)}
                        className="w-full px-3 py-2 border-2 border-gray-200 rounded-xl text-xs focus:outline-none focus:border-indigo-600 bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-gray-500 mb-1 flex items-center space-x-1">
                        <Clock className="w-3 h-3 text-indigo-600" />
                        <span>Time</span>
                      </label>
                      <input
                        type="time"
                        required
                        value={gigScheduledTime}
                        onChange={e => setGigScheduledTime(e.target.value)}
                        className="w-full px-3 py-2 border-2 border-gray-200 rounded-xl text-xs focus:outline-none focus:border-indigo-600 bg-white"
                      />
                    </div>
                  </div>
                )}
              </div>

              <button
                type="submit"
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-semibold text-sm transition shadow-lg mt-2"
              >
                Post Gig & Show on Map
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Congratulations Modal on Creating a Gig */}
      {gigCongratsModal && (
        <div className="fixed inset-0 z-[10250] flex items-center justify-center bg-black/55 backdrop-blur-sm p-4 pointer-events-auto">
          <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-6 text-center space-y-4 relative overflow-hidden border-2 border-emerald-200">
            <FloatingToolsBackdrop compact count={8} />
            <div className="relative z-10 w-16 h-16 bg-gradient-to-tr from-emerald-500 to-teal-500 text-white rounded-full flex items-center justify-center mx-auto shadow-xl">
              <Sparkles className="w-8 h-8 animate-pulse" />
            </div>
            <div className="relative z-10 space-y-1.5">
              <span className="inline-block px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-[10px] font-black uppercase tracking-wider">
                Congratulations!
              </span>
              <h3 className="text-xl font-black text-gray-900">Your Gig is Live!</h3>
              <p className="text-xs text-gray-600">
                <strong className="text-gray-900">"{gigCongratsModal.title}"</strong> has been posted on the map
                {gigCongratsModal.scheduleType === 'scheduled' && gigCongratsModal.scheduledDate
                  ? ` for ${gigCongratsModal.scheduledDate}${gigCongratsModal.scheduledTime ? ` at ${gigCongratsModal.scheduledTime}` : ''}`
                  : ' to start immediately'}
                .
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                if (soundEnabled) playClickSound();
                setGigCongratsModal(null);
              }}
              className="relative z-10 w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold text-sm shadow-lg transition"
            >
              View on Map
            </button>
          </div>
        </div>
      )}

      {/* Edit Gig Modal (Creator Only) */}
      {editingGig && (
        <div className="fixed inset-0 z-[10150] flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 pointer-events-auto">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 space-y-4 relative overflow-hidden">
            <FloatingToolsBackdrop compact count={7} />
            <div className="flex items-center space-x-3 relative z-10">
              <button
                onClick={() => {
                  if (soundEnabled) playClickSound();
                  setEditingGig(null);
                }}
                aria-label="Back"
                title="Back"
                className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 transition shrink-0"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h3 className="font-bold text-xl text-gray-900 flex items-center space-x-2">
                <Pencil className="w-5 h-5 text-indigo-600" />
                <span>Edit Gig Post</span>
              </h3>
            </div>
            <form onSubmit={handleSaveEditGig} className="space-y-3 relative z-10">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Gig Title</label>
                <input
                  type="text"
                  required
                  value={editGigTitle}
                  onChange={e => setEditGigTitle(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-2xl text-sm focus:outline-none focus:border-indigo-600 bg-white/90"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  required
                  value={editGigDesc}
                  onChange={e => setEditGigDesc(e.target.value)}
                  rows={2}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-2xl text-sm focus:outline-none focus:border-indigo-600 bg-white/90"
                />
              </div>
              <div className="relative">
                <label className="block text-xs font-medium text-gray-700 mb-1">Gig Location</label>
                <div className="relative">
                  <MapPin className="absolute left-3.5 top-3.5 w-4 h-4 text-indigo-600" />
                  <input
                    type="text"
                    placeholder="Type street, area, or city for suggestions..."
                    value={editGigLocationQuery}
                    onChange={e => {
                      setEditGigLocationQuery(e.target.value);
                      setEditGigSelectedCoords(null);
                    }}
                    className="w-full pl-10 pr-10 py-3 border-2 border-gray-200 rounded-2xl text-sm focus:outline-none focus:border-indigo-600 bg-white/90"
                  />
                  {isSearchingEditGigLocation && (
                    <Loader2 className="absolute right-3.5 top-3.5 w-4 h-4 text-indigo-600 animate-spin" />
                  )}
                </div>
                {editGigLocationResults.length > 0 && (
                  <div className="mt-1.5 max-h-36 overflow-y-auto bg-white border-2 border-indigo-200 rounded-2xl shadow-xl divide-y divide-gray-100">
                    {editGigLocationResults.map(item => (
                      <button
                        key={item.place_id}
                        type="button"
                        onClick={() => {
                          if (soundEnabled) playClickSound();
                          editGigLocationJustPickedRef.current = true;
                          setEditGigLocationQuery(item.display_name);
                          setEditGigSelectedCoords({ lat: parseFloat(item.lat), lng: parseFloat(item.lon) });
                          setEditGigLocationResults([]);
                        }}
                        className="w-full text-left px-3 py-2 text-xs text-gray-800 hover:bg-indigo-50 flex items-center space-x-2 transition"
                      >
                        <MapPin className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                        <span className="truncate">{item.display_name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Budget ({selectedCountry.flag} {selectedCountry.currencyCode} {selectedCountry.symbol.trim()})
                </label>
                <input
                  type="text"
                  value={editGigBudget}
                  onChange={e => setEditGigBudget(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-2xl text-sm focus:outline-none focus:border-indigo-600 bg-white/90"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-medium text-gray-700">Schedule</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (soundEnabled) playClickSound();
                      setEditGigScheduleType('immediate');
                    }}
                    className={`py-2 px-3 rounded-2xl border-2 text-xs font-bold transition ${
                      editGigScheduleType === 'immediate'
                        ? 'bg-indigo-600 border-indigo-600 text-white'
                        : 'bg-white border-gray-200 text-gray-700'
                    }`}
                  >
                    Immediately
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (soundEnabled) playClickSound();
                      setEditGigScheduleType('scheduled');
                    }}
                    className={`py-2 px-3 rounded-2xl border-2 text-xs font-bold transition ${
                      editGigScheduleType === 'scheduled'
                        ? 'bg-indigo-600 border-indigo-600 text-white'
                        : 'bg-white border-gray-200 text-gray-700'
                    }`}
                  >
                    Set Date & Time
                  </button>
                </div>
                {editGigScheduleType === 'scheduled' && (
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="date"
                      required
                      value={editGigScheduledDate}
                      onChange={e => setEditGigScheduledDate(e.target.value)}
                      className="w-full px-3 py-2 border-2 border-gray-200 rounded-xl text-xs bg-white"
                    />
                    <input
                      type="time"
                      required
                      value={editGigScheduledTime}
                      onChange={e => setEditGigScheduledTime(e.target.value)}
                      className="w-full px-3 py-2 border-2 border-gray-200 rounded-xl text-xs bg-white"
                    />
                  </div>
                )}
              </div>

              <button
                type="submit"
                className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-semibold text-sm transition shadow-lg mt-2"
              >
                Save Gig Changes
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Complete Gig & Star Rating Modal (Gig Owner Only) */}
      {completingGig && (
        <div className="fixed inset-0 z-[10160] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 pointer-events-auto">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 space-y-4 relative overflow-hidden">
            <FloatingToolsBackdrop compact count={7} />
            <div className="flex items-center space-x-3 relative z-10">
              <button
                onClick={() => {
                  if (soundEnabled) playClickSound();
                  setCompletingGig(null);
                }}
                aria-label="Back"
                title="Back"
                className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 transition shrink-0"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h3 className="font-bold text-lg text-gray-900 flex items-center space-x-2">
                  <CheckCircle className="w-5 h-5 text-emerald-600" />
                  <span>Complete Gig & Rate User</span>
                </h3>
                <p className="text-[11px] text-gray-500 truncate">
                  {completingGig.title} • Worker: {completingGig.applicantName || completingGig.applicantEmail || 'Applicant'}
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmitGigCompletionRating} className="space-y-4 relative z-10">
              <div className="p-4 bg-amber-50/80 border border-amber-200 rounded-2xl text-center space-y-2">
                <label className="block text-xs font-bold text-amber-950">
                  Select Star Rating (Appears on User Profile)
                </label>
                <div className="flex items-center justify-center space-x-2">
                  {[1, 2, 3, 4, 5].map(starVal => (
                    <button
                      key={starVal}
                      type="button"
                      onClick={() => {
                        if (soundEnabled) playClickSound();
                        setRatingStars(starVal);
                      }}
                      className="p-1 transition transform hover:scale-110 active:scale-95"
                    >
                      <Star
                        className={`w-8 h-8 ${
                          starVal <= ratingStars
                            ? 'fill-amber-400 text-amber-500'
                            : 'text-gray-300'
                        }`}
                      />
                    </button>
                  ))}
                </div>
                <p className="text-xs font-bold text-amber-800">{ratingStars} out of 5 Stars</p>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Review Comment (Optional)</label>
                <textarea
                  rows={2}
                  placeholder="Share feedback on completed gig..."
                  value={ratingComment}
                  onChange={e => setRatingComment(e.target.value)}
                  className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-2xl text-sm focus:outline-none focus:border-emerald-600 bg-white/90"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold text-sm transition shadow-lg"
              >
                Mark Gig Completed & Submit Rating
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Add Company Modal */}
      {addCompanyModal && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 pointer-events-auto">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 space-y-4 relative overflow-hidden">
            <FloatingToolsBackdrop compact count={7} />
            <div className="flex items-center space-x-3 relative z-10">
              <button
                onClick={() => {
                  if (soundEnabled) playClickSound();
                  setAddCompanyModal(false);
                }}
                aria-label="Back"
                title="Back"
                className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 hover:text-gray-900 transition shrink-0"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h3 className="font-bold text-xl text-gray-900 flex items-center space-x-2">
                <Building2 className="w-5 h-5 text-purple-600" />
                <span>Add Company Location</span>
              </h3>
            </div>
            <form onSubmit={handleAddCompanySubmit} className="space-y-3 relative z-10">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Company Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Acme Corp"
                  value={companyName}
                  onChange={e => setCompanyName(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-2xl text-sm focus:outline-none focus:border-purple-600 bg-white/90"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Category</label>
                <select
                  value={companyCategory}
                  onChange={e => setCompanyCategory(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-2xl text-sm bg-white focus:outline-none focus:border-purple-600"
                >
                  <option value="Technology">Technology 💻</option>
                  <option value="Retail">Retail & Store 🛍️</option>
                  <option value="Finance">Finance & Banking 💳</option>
                  <option value="Services">Professional Services ⚙️</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Address / Location</label>
                <input
                  type="text"
                  placeholder="e.g. 123 Main St"
                  value={companyAddress}
                  onChange={e => setCompanyAddress(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-2xl text-sm focus:outline-none focus:border-purple-600 bg-white/90"
                />
              </div>
              <button
                type="submit"
                className="w-full py-3.5 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl font-semibold text-sm transition shadow-lg mt-2"
              >
                List Company & Show on Map
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Mandatory Auth Gate & Account Modal */}
      {(authModalOpen || !userLoggedIn) && (
        <div className={`fixed inset-0 z-[10500] flex items-center justify-center p-4 pointer-events-auto ${!userLoggedIn ? 'bg-slate-900/65 backdrop-blur-md' : 'bg-black/50 backdrop-blur-xs'}`}>
          <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-6 space-y-5 relative overflow-hidden border border-gray-100">
            <FloatingToolsBackdrop compact count={8} />
            <div className="relative z-10 flex items-start space-x-3">
              {userLoggedIn && (
                <button
                  onClick={() => {
                    if (soundEnabled) playClickSound();
                    setAuthModalOpen(false);
                    setAuthError(null);
                  }}
                  aria-label="Back"
                  title="Back"
                  className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 hover:text-gray-900 transition shrink-0"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
              )}
              <div>
                <h3 className="font-bold text-xl text-gray-900">
                  {userLoggedIn
                    ? 'Account'
                    : authMode === 'signin'
                      ? 'Welcome Back'
                      : 'Create Account'}
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                  {userLoggedIn
                    ? 'Manage your active session'
                    : authMode === 'signup'
                      ? 'Sign up to get started and access the app'
                      : 'Sign in to continue to the app'}
                </p>
              </div>
            </div>

            {userLoggedIn ? (
              <div className="space-y-4 py-2 relative z-10">
                <div className="p-3 bg-blue-50 border border-blue-100 rounded-2xl text-xs text-blue-900">
                  Signed in as <span className="font-bold">{userLoggedIn}</span>
                </div>
                <button
                  onClick={() => {
                    if (soundEnabled) playClickSound();
                    setUserLoggedIn(null);
                    setAuthModalOpen(false);
                    setPhoneMenuOpen(false);
                    setCurrentView('map');
                    setProfileModalOpen(false);
                    setCreateGigModal(false);
                    setAddCompanyModal(false);
                    setSettingsModalOpen(false);
                    setUpgradeModalOpen(false);
                  }}
                  className="w-full py-3 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-semibold text-sm transition shadow-md"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <div className="space-y-4 relative z-10">
                {authError && (
                  <div className="p-3 bg-red-50 border border-red-100 rounded-2xl text-xs text-red-600 font-medium">
                    {authError}
                  </div>
                )}

                {/* Google Sign-in Button */}
                <button
                  onClick={handleGoogleSignIn}
                  className="w-full py-3 px-4 bg-white hover:bg-gray-50 text-gray-800 border-2 border-gray-200 rounded-2xl font-semibold text-sm transition shadow-sm flex items-center justify-center space-x-2"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"/>
                    <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.13 0-5.78-2.11-6.73-4.96H1.19v3.15C3.17 21.31 7.23 24 12 24z"/>
                    <path fill="#FBBC05" d="M5.27 14.24c-.25-.72-.38-1.49-.38-2.24s.13-1.52.38-2.24V6.61H1.19C.43 8.15 0 9.89 0 12s.43 3.85 1.19 5.39l4.08-3.15z"/>
                    <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.23 0 3.17 2.69 1.19 6.61l4.08 3.15c.95-2.85 3.6-4.96 6.73-4.96z"/>
                  </svg>
                  <span>Sign in with Google</span>
                </button>

                <div className="relative flex py-2 items-center">
                  <div className="flex-grow border-t border-gray-200"></div>
                  <span className="flex-shrink mx-4 text-gray-400 text-xs">or with email</span>
                  <div className="flex-grow border-t border-gray-200"></div>
                </div>

                <div className="flex bg-gray-100 p-1 rounded-2xl">
                  <button
                    type="button"
                    onClick={() => {
                      if (soundEnabled) playClickSound();
                      setAuthMode('signin');
                      setAuthError(null);
                    }}
                    className={`flex-1 py-2 text-xs font-semibold rounded-xl transition ${
                      authMode === 'signin' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600'
                    }`}
                  >
                    Sign In
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (soundEnabled) playClickSound();
                      setAuthMode('signup');
                      setAuthError(null);
                    }}
                    className={`flex-1 py-2 text-xs font-semibold rounded-xl transition ${
                      authMode === 'signup' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600'
                    }`}
                  >
                    Sign Up
                  </button>
                </div>

                <form onSubmit={handleAuthSubmit} className="space-y-3">
                  <div>
                    <input
                      type="email"
                      required
                      placeholder="Email address"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-2xl text-sm focus:outline-none focus:border-blue-600"
                    />
                  </div>

                  <div>
                    <input
                      type="password"
                      required
                      placeholder="Password"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-2xl text-sm focus:outline-none focus:border-blue-600"
                    />
                  </div>

                  {authMode === 'signup' && (
                    <div>
                      <input
                        type="text"
                        placeholder="Referral Code (Optional — Get 30-Day Free Trial)"
                        value={referralCodeInput}
                        onChange={e => setReferralCodeInput(e.target.value)}
                        className="w-full px-4 py-2.5 border-2 border-indigo-100 bg-indigo-50/40 rounded-2xl text-xs focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  )}

                  <button
                    type="submit"
                    className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-semibold text-sm transition shadow-lg"
                  >
                    {authMode === 'signin' ? 'Sign In' : 'Sign Up'}
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Country & Currency Selection Modal (One-time permanent selection — cannot be undone or changed) */}
      {userLoggedIn && countryModalOpen && !countryLocked && (
        <div className="fixed inset-0 z-[10300] flex items-center justify-center bg-black/65 backdrop-blur-sm p-4 pointer-events-auto">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 space-y-4 relative overflow-hidden border border-emerald-100">
            <FloatingToolsBackdrop count={10} />

            <div className="relative z-10 flex items-start space-x-3">
              <button
                onClick={() => {
                  if (soundEnabled) playClickSound();
                  setCountryModalOpen(false);
                }}
                aria-label="Back"
                title="Back"
                className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 hover:text-gray-900 transition shrink-0 mt-0.5"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="space-y-1.5">
                <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 bg-emerald-100 text-emerald-800 rounded-full text-[10px] font-bold uppercase tracking-wider">
                  <Globe className="w-3 h-3" />
                  <span>Country & Currency Setup</span>
                </div>
                <h3 className="font-bold text-xl text-gray-900">Which country are you in?</h3>
                <p className="text-xs text-gray-500">
                  Once you choose a country, it is permanently locked and cannot be undone or changed.
                </p>
              </div>
            </div>

            {/* Search Country Input */}
            <div className="relative z-10">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search country or currency (e.g. South Africa, UK, ZAR)..."
                value={countrySearchQuery}
                onChange={e => setCountrySearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-200 rounded-2xl text-xs bg-white/95 focus:outline-none focus:border-emerald-600"
              />
            </div>

            {/* Country Cards List */}
            <div className="relative z-10 max-h-64 overflow-y-auto space-y-1.5 pr-1">
              {COUNTRIES_CURRENCIES.filter(c =>
                c.country.toLowerCase().includes(countrySearchQuery.toLowerCase()) ||
                c.currencyCode.toLowerCase().includes(countrySearchQuery.toLowerCase()) ||
                c.symbol.toLowerCase().includes(countrySearchQuery.toLowerCase())
              ).map(country => {
                const isSelected = selectedCountry.code === country.code;
                return (
                  <button
                    key={country.code}
                    type="button"
                    onClick={() => {
                      if (soundEnabled) playClickSound();
                      setSelectedCountry(country);
                      setCountryLocked(true);
                      localStorage.setItem('geo_osm_country_locked', 'true');
                      setCountryModalOpen(false);
                      setCountrySearchQuery('');
                    }}
                    className={`w-full flex items-center justify-between p-3 rounded-2xl border-2 text-left transition ${
                      isSelected
                        ? 'bg-emerald-50 border-emerald-500 shadow-sm'
                        : 'bg-white/90 hover:bg-gray-50 border-gray-200'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <span className="text-xl">{country.flag}</span>
                      <div>
                        <div className="font-bold text-xs text-gray-900">{country.country}</div>
                        <div className="text-[10px] text-gray-500">Currency: {country.currencyCode}</div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-xl text-xs font-black">
                        {country.symbol.trim()} ({country.currencyCode})
                      </span>
                      {isSelected && <CheckCircle className="w-4 h-4 text-emerald-600" />}
                    </div>
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => {
                if (soundEnabled) playClickSound();
                setCountryLocked(true);
                localStorage.setItem('geo_osm_country_locked', 'true');
                setCountryModalOpen(false);
              }}
              className="relative z-10 w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold text-xs shadow-lg transition flex items-center justify-center space-x-1.5"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Confirm & Lock {selectedCountry.flag} {selectedCountry.country} ({selectedCountry.currencyCode})</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

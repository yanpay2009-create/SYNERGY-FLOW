import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { io, Socket } from "socket.io-client";
import { User, UserTier, Product, CartItem, FeedItem, AppContextType, TeamMember, Referrer, CommissionTransaction, Address, Coupon, PaymentType, BankAccount, CreditCardInfo, KYCStatus, Notification, Order, Language, FontSize, Ad, OnboardingSlide, OrderStatus, Promotion, SystemSettings, CampaignAsset, ToastMessage, OrderTimelineItem, LevelUpInfo } from '../types';
import { dictionary } from './translations';

const AppContext = createContext<AppContextType | undefined>(undefined);

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

// Accuracy Helper: Ensure precision to 2 decimal places for all financial operations
const TO_PRECISION = (num: number): number => Math.round((num + Number.EPSILON) * 100) / 100;

export const TIER_THRESHOLDS = {
  [UserTier.STARTER]: 0,
  [UserTier.MARKETER]: 1500,
  [UserTier.BUILDER]: 4500,
  [UserTier.EXECUTIVE]: 9000
};

const TIER_RATES = {
  [UserTier.STARTER]: 0.05,
  [UserTier.MARKETER]: 0.10,
  [UserTier.BUILDER]: 0.20,
  [UserTier.EXECUTIVE]: 0.30
};

const TIER_DISCOUNTS = {
  [UserTier.STARTER]: 0,
  [UserTier.MARKETER]: 0.10,
  [UserTier.BUILDER]: 0.20,
  [UserTier.EXECUTIVE]: 0.30
};

const DEFAULT_USER_EMAIL = "synergyflow.my@gmail.com";

const INITIAL_PRODUCTS: Product[] = [
  { id: 1, name: "Collagen Glow Pro", price: 1200, category: "Health", image: "https://picsum.photos/300/300?random=1", images: ["https://picsum.photos/300/300?random=1", "https://picsum.photos/300/300?random=101"], descriptionImages: ["https://picsum.photos/600/800?random=1001", "https://picsum.photos/600/800?random=1002"], sold: 1200, stock: 50, description: "Premium marine collagen peptides for radiant skin.", reviews: [], isPromo: true, promoDiscount: 15, expiryDate: new Date(Date.now() + 172800000).toISOString() },
  { id: 2, name: "Smart Watch Ultra", price: 3500, category: "Gadgets", image: "https://picsum.photos/300/300?random=2", images: ["https://picsum.photos/300/300?random=2", "https://picsum.photos/300/300?random=201"], sold: 850, stock: 20, description: "The ultimate companion for adventure.", reviews: [], isPromo: true, promoDiscount: 20, expiryDate: new Date(Date.now() + 86400000).toISOString() },
  { id: 3, name: "Wireless Earbuds", price: 990, category: "Gadgets", image: "https://picsum.photos/300/300?random=3", images: ["https://picsum.photos/300/300?random=3"], sold: 2400, stock: 100, description: "Immersive sound with noise cancellation.", reviews: [] },
  { id: 4, name: "Organic Face Oil", price: 850, category: "Beauty", image: "https://picsum.photos/300/300?random=4", images: ["https://picsum.photos/300/300?random=4"], sold: 450, stock: 0, description: "Pure organic oils for a healthy glow.", reviews: [], isPromo: true, promoDiscount: 10, expiryDate: new Date(Date.now() + 259200000).toISOString() }
];

const INITIAL_ADS: Ad[] = [
  { id: 1, title: 'V5.0 SYNERGY FLOW', subtitle: 'Harness the power of AI to generate viral content and boost your sales.', image: 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?q=80&w=800&auto=format&fit=crop', active: true, placement: 'home', expiryDate: new Date(Date.now() + 86400000).toISOString() },
  { id: 2, title: 'Earn from Feed', subtitle: 'Share posts and earn commissions.', image: 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?auto=format&fit=crop&w=800&q=80', active: true, placement: 'feed' },
  { id: 3, title: 'Manage Account', subtitle: 'View your performance and tiers.', image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=800&q=80', active: true, placement: 'account', expiryDate: new Date(Date.now() + 43200000).toISOString() }
];

const INITIAL_ASSETS: CampaignAsset[] = [
  { id: 1, title: 'Summer Promo Set 1', description: 'High conversion banner for seasonal sales.', image: 'https://picsum.photos/200/200?random=101', active: true, category: 'Health', commission: '15%', status: 'Active', adFormat: 'Banner 1080x1080', conditions: 'Valid until end of month' },
  { id: 2, title: 'Summer Promo Set 2', description: 'Alternative conversion banner.', image: 'https://picsum.photos/200/200?random=102', active: true, category: 'Beauty', commission: '20%', status: 'Active', adFormat: 'Video 9:16', conditions: 'Minimum 10 sales required' },
  { id: 3, title: 'Gadget Launch', description: 'New smart watch release campaign.', image: 'https://picsum.photos/200/200?random=103', active: true, category: 'Gadgets', commission: '10%', status: 'Upcoming', adFormat: 'Carousel', conditions: 'Starts next week' }
];

const INITIAL_ONBOARDING: OnboardingSlide[] = [
  { id: 1, title: "Welcome to Synergy Flow", desc: "The premium affiliate network designed for high-conversion marketing.", image: "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?q=80&w=800&auto=format&fit=crop" },
  { id: 2, title: "Tiered Commissions", desc: "Achieve Executive status and earn up to 30% on every direct sale.", image: "https://images.unsplash.com/photo-1579621970795-87facc2f976d?q=80&w=800&auto=format&fit=crop" },
  { id: 3, title: "Content Studio", desc: "Use our built-in AI to generate viral reviews and marketing posts instantly.", image: "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?q=80&w=800&auto=format&fit=crop" }
];

const INITIAL_TEAM: TeamMember[] = [
  { id: 101, uplineId: DEFAULT_USER_EMAIL, name: "Somchai Jaidee", tier: UserTier.MARKETER, avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Somchai", totalSales: 2500, joinedDate: "2024-01-15", relationship: 'Direct', phone: "0812345678", lineId: "somchai_jd" },
  { id: 102, uplineId: DEFAULT_USER_EMAIL, name: "Somsri Rakdee", tier: UserTier.BUILDER, avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Somsri", totalSales: 5800, joinedDate: "2024-02-10", relationship: 'Direct', phone: "0898765432", lineId: "somsri_r" },
  { id: 103, uplineId: DEFAULT_USER_EMAIL, name: "Wichai Charn", tier: UserTier.STARTER, avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Wichai", totalSales: 800, joinedDate: "2024-03-01", relationship: 'Direct', phone: "0855554444", lineId: "wichai_c" },
  { id: 104, uplineId: DEFAULT_USER_EMAIL, name: "Ananda Ever", tier: UserTier.EXECUTIVE, avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Ananda", totalSales: 12500, joinedDate: "2023-11-20", relationship: 'Indirect', phone: "0877778888", lineId: "ananda_e" },
  { id: 105, uplineId: DEFAULT_USER_EMAIL, name: "Priya Singh", tier: UserTier.BUILDER, avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Priya", totalSales: 4200, joinedDate: "2024-02-15", relationship: 'Direct', phone: "0822223333", lineId: "priya_s" },
  { id: 106, uplineId: DEFAULT_USER_EMAIL, name: "Kevin Hart", tier: UserTier.MARKETER, avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Kevin", totalSales: 1800, joinedDate: "2024-03-02", relationship: 'Indirect', phone: "0844445555", lineId: "kevin_h" },
  { id: 107, uplineId: DEFAULT_USER_EMAIL, name: "Nattapong K.", tier: UserTier.EXECUTIVE, avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Nattapong", totalSales: 15400, joinedDate: "2023-12-05", relationship: 'Direct', phone: "0811112222", lineId: "natt_k" },
  { id: 108, uplineId: DEFAULT_USER_EMAIL, name: "Sarisa J.", tier: UserTier.MARKETER, avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sarisa", totalSales: 2100, joinedDate: "2024-02-28", relationship: 'Indirect', phone: "0833334444", lineId: "sarisa_j" },
  { id: 109, uplineId: DEFAULT_USER_EMAIL, name: "Tawatchai S.", tier: UserTier.BUILDER, avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Tawatchai", totalSales: 6200, joinedDate: "2024-01-20", relationship: 'Direct', phone: "0866667777", lineId: "tawat_s" },
  { id: 110, uplineId: DEFAULT_USER_EMAIL, name: "Manee Mejai", tier: UserTier.STARTER, avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Manee", totalSales: 450, joinedDate: "2024-03-04", relationship: 'Direct', phone: "0888889999", lineId: "manee_m" },
  { id: 111, uplineId: DEFAULT_USER_EMAIL, name: "John Doe", tier: UserTier.MARKETER, avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=John", totalSales: 2800, joinedDate: "2024-02-12", relationship: 'Indirect', phone: "0812223333", lineId: "john_d" },
  { id: 112, uplineId: DEFAULT_USER_EMAIL, name: "Jane Smith", tier: UserTier.BUILDER, avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Jane", totalSales: 7500, joinedDate: "2023-12-15", relationship: 'Direct', phone: "0894445555", lineId: "jane_s" }
];

const INITIAL_COMMISSIONS: CommissionTransaction[] = [
  { id: 201, userId: DEFAULT_USER_EMAIL, orderId: "SF-882134", date: "2024-03-05 14:20", source: "Direct Sale: Collagen Glow Pro", type: 'Direct', amount: 180, status: 'Paid' },
  { id: 202, userId: DEFAULT_USER_EMAIL, orderId: "SF-882135", date: "2024-03-04 09:15", source: "Team Sale: Somchai Jaidee", type: 'Team', amount: 45, status: 'Paid' },
  { id: 203, userId: DEFAULT_USER_EMAIL, orderId: "SF-882136", date: "2024-03-03 18:45", source: "Direct Sale: Smart Watch Ultra", type: 'Direct', amount: 525, status: 'Pending' },
  { id: 204, userId: DEFAULT_USER_EMAIL, orderId: "SF-882137", date: "2024-03-02 11:30", source: "Team Sale: Somsri Rakdee", type: 'Team', amount: 120, status: 'Paid' },
  { id: 205, userId: DEFAULT_USER_EMAIL, date: "2024-02-28 10:00", source: "Withdrawal: KBank | ACC: 123-4-56789-0", type: 'Withdrawal', amount: -1000, status: 'Completed' },
  { id: 206, userId: DEFAULT_USER_EMAIL, orderId: "SF-882138", date: "2024-02-25 16:40", source: "Direct Sale: Wireless Earbuds", type: 'Direct', amount: 99, status: 'Paid' },
  { id: 207, userId: DEFAULT_USER_EMAIL, orderId: "SF-882139", date: "2024-02-20 13:20", source: "Team Sale: Ananda Ever", type: 'Team', amount: 375, status: 'Paid' },
  { id: 208, userId: DEFAULT_USER_EMAIL, orderId: "SF-882140", date: "2024-03-06 10:10", source: "Direct Sale: Organic Face Oil", type: 'Direct', amount: 127.5, status: 'Pending' },
  { id: 209, userId: DEFAULT_USER_EMAIL, orderId: "SF-882141", date: "2024-03-06 11:30", source: "Team Sale: Nattapong K.", type: 'Team', amount: 462, status: 'Paid' },
  { id: 210, userId: DEFAULT_USER_EMAIL, orderId: "SF-882142", date: "2024-03-05 16:55", source: "Team Sale: Tawatchai S.", type: 'Team', amount: 186, status: 'Paid' },
  { id: 211, userId: DEFAULT_USER_EMAIL, orderId: "SF-882143", date: "2024-03-05 17:20", source: "Direct Sale: Collagen Glow Pro", type: 'Direct', amount: 180, status: 'Paid' },
  { id: 212, userId: DEFAULT_USER_EMAIL, date: "2024-03-01 09:00", source: "Withdrawal: SCB | ACC: 987-6-54321-0", type: 'Withdrawal', amount: -2500, status: 'Completed' },
  { id: 213, userId: DEFAULT_USER_EMAIL, orderId: "SF-882144", date: "2024-03-06 14:45", source: "Team Sale: Jane Smith", type: 'Team', amount: 225, status: 'Paid' },
  { id: 214, userId: DEFAULT_USER_EMAIL, orderId: "SF-882145", date: "2024-03-06 15:30", source: "Direct Sale: Smart Watch Ultra", type: 'Direct', amount: 700, status: 'Pending' }
];

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem('synergy_user');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      console.error('Failed to parse synergy_user', e);
      return null;
    }
  });

  const isLoggedIn = !!user;
  
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem('synergy_cart');
      const parsed = saved ? JSON.parse(saved) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.error('Failed to parse synergy_cart', e);
      return [];
    }
  });

  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem('synergy_lang');
    return (saved as Language) || 'en';
  });
  
  const [fontSize, setFontSize] = useState<FontSize>(() => {
      const saved = localStorage.getItem('synergy_font_size');
      return (saved as FontSize) || 'medium';
  });

  const [products, setProducts] = useState<Product[]>(() => {
    try {
      const saved = localStorage.getItem('synergy_products');
      const parsed = saved ? JSON.parse(saved) : INITIAL_PRODUCTS;
      return Array.isArray(parsed) ? parsed : INITIAL_PRODUCTS;
    } catch (e) {
      console.error('Failed to parse synergy_products', e);
      return INITIAL_PRODUCTS;
    }
  });

  const [feed, setFeed] = useState<FeedItem[]>(() => {
    try {
      const saved = localStorage.getItem('synergy_feed');
      const parsed = saved ? JSON.parse(saved) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.error('Failed to parse synergy_feed', e);
      return [];
    }
  });

  const [ads, setAds] = useState<Ad[]>(() => {
    try {
      const saved = localStorage.getItem('synergy_ads');
      const parsed = saved ? JSON.parse(saved) : INITIAL_ADS;
      return Array.isArray(parsed) ? parsed : INITIAL_ADS;
    } catch (e) {
      console.error('Failed to parse synergy_ads', e);
      return INITIAL_ADS;
    }
  });

  const [campaignAssets, setCampaignAssets] = useState<CampaignAsset[]>(() => {
      try {
          const saved = localStorage.getItem('synergy_campaign_assets');
          const parsed = saved ? JSON.parse(saved) : INITIAL_ASSETS;
          return Array.isArray(parsed) ? parsed : INITIAL_ASSETS;
      } catch (e) {
          return INITIAL_ASSETS;
      }
  });

  const [onboardingSlides, setOnboardingSlides] = useState<OnboardingSlide[]>(() => {
    try {
      const saved = localStorage.getItem('synergy_onboarding');
      const parsed = saved ? JSON.parse(saved) : INITIAL_ONBOARDING;
      return Array.isArray(parsed) ? parsed : INITIAL_ONBOARDING;
    } catch (e) {
      console.error('Failed to parse synergy_onboarding', e);
      return INITIAL_ONBOARDING;
    }
  });

  const [allOrders, setAllOrders] = useState<Order[]>(() => {
    try {
      const saved = localStorage.getItem('synergy_orders');
      const parsed = saved ? JSON.parse(saved) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.error('Failed to parse synergy_orders', e);
      return [];
    }
  });

  const [allTeam, setAllTeam] = useState<TeamMember[]>(() => {
    try {
      const saved = localStorage.getItem('synergy_team');
      const parsed = saved ? JSON.parse(saved) : INITIAL_TEAM;
      return Array.isArray(parsed) ? parsed : INITIAL_TEAM;
    } catch (e) {
      console.error('Failed to parse synergy_team', e);
      return INITIAL_TEAM;
    }
  });

  const [allCommissions, setAllCommissions] = useState<CommissionTransaction[]>(() => {
    try {
      const saved = localStorage.getItem('synergy_commissions');
      const parsed = saved ? JSON.parse(saved) : INITIAL_COMMISSIONS;
      return Array.isArray(parsed) ? parsed : INITIAL_COMMISSIONS;
    } catch (e) {
      console.error('Failed to parse synergy_commissions', e);
      return INITIAL_COMMISSIONS;
    }
  });

  const [allNotifications, setAllNotifications] = useState<Notification[]>(() => {
    try {
      const saved = localStorage.getItem('synergy_notifications');
      const parsed = saved ? JSON.parse(saved) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.error('Failed to parse synergy_notifications', e);
      return [];
    }
  });

  const [systemSettings, setSystemSettings] = useState<SystemSettings>(() => {
    try {
      const saved = localStorage.getItem('synergy_settings');
      return saved ? JSON.parse(saved) : {
          logo: null,
          slipBackground: null,
          contactLinks: { line: '', phone: '', email: '', website: '', terms: '', privacy: '' }
      };
    } catch (e) {
      console.error('Failed to parse synergy_settings', e);
      return {
          logo: null,
          slipBackground: null,
          contactLinks: { line: '', phone: '', email: '', website: '', terms: '', privacy: '' }
      };
    }
  });

  const [activePromo, setActivePromo] = useState<Promotion | null>(null);
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [currentToast, setCurrentToast] = useState<ToastMessage | null>(null);
  const [bottomNavHidden, setBottomNavHidden] = useState(false);
  
  const [pendingLevelUp, setPendingLevelUp] = useState<LevelUpInfo | null>(null);
  const dismissLevelUp = () => setPendingLevelUp(null);

  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    const newSocket = io(window.location.origin);
    setSocket(newSocket);

    newSocket.on("order:verified", (orderId) => {
      showToast({ message: `Order ${orderId} has been verified by admin!`, type: 'success' });
      setAllOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'To Ship' } : o));
    });

    newSocket.on("post:approved", (postId) => {
      showToast({ message: `Your post has been approved and is now live!`, type: 'success' });
      setFeed(prev => prev.map(p => p.id === postId ? { ...p, status: 'Approved' } : p));
    });

    return () => {
      newSocket.disconnect();
    };
  }, []);

  // Security Unlocked state is non-persistent for safety
  const [isSecurityUnlocked, setIsSecurityUnlocked] = useState(false);

  const [notificationsEnabled, setNotificationsEnabledState] = useState<boolean>(() => {
    const saved = localStorage.getItem('synergy_notifications_enabled');
    return saved === null ? true : saved === 'true';
  });

  const setNotificationsEnabled = (enabled: boolean) => {
    setNotificationsEnabledState(enabled);
    localStorage.setItem('synergy_notifications_enabled', String(enabled));
  };

  const userOrders = useMemo(() => allOrders.filter(o => o.userId === user?.email), [allOrders, user]);
  const userTeam = useMemo(() => allTeam.filter(m => m.uplineId === user?.email), [allTeam, user]);
  const userCommissions = useMemo(() => allCommissions.filter(c => c.userId === user?.email), [allCommissions, user]);
  
  const userNotifications = useMemo(() => 
    allNotifications.filter(n => n.userId === user?.email || n.userId === 'global'), 
    [allNotifications, user]
  );

  const [referrer, setReferrer] = useState<Referrer | null>(() => {
    try {
      const saved = localStorage.getItem('synergy_referrer');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      console.error('Failed to parse synergy_referrer', e);
      return null;
    }
  });

  const [addresses, setAddresses] = useState<Address[]>(() => {
    try {
      const saved = localStorage.getItem('synergy_addresses');
      const parsed = saved ? JSON.parse(saved) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.error('Failed to parse synergy_addresses', e);
      return [];
    }
  });
  const [selectedAddressId, setSelectedAddressId] = useState<number | null>(() => {
    try {
      const saved = localStorage.getItem('synergy_selected_address');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      console.error('Failed to parse synergy_selected_address', e);
      return null;
    }
  });
  const [paymentMethod, setPaymentMethodState] = useState<PaymentType>(() => {
      const saved = localStorage.getItem('synergy_payment_method');
      return (saved as PaymentType) || 'PromptPay';
  });
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>(() => {
    try {
      const saved = localStorage.getItem('synergy_banks');
      const parsed = saved ? JSON.parse(saved) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.error('Failed to parse synergy_banks', e);
      return [];
    }
  });
  const [selectedBankId, setSelectedBankIdState] = useState<number | null>(() => {
    try {
      const saved = localStorage.getItem('synergy_selected_bank');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      console.error('Failed to parse synergy_selected_bank', e);
      return null;
    }
  });
  const [savedCards, setSavedCards] = useState<CreditCardInfo[]>(() => {
    try {
      const saved = localStorage.getItem('synergy_cards');
      const parsed = saved ? JSON.parse(saved) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.error('Failed to parse synergy_cards', e);
      return [];
    }
  });
  const [selectedCardId, setSelectedCardIdState] = useState<number | null>(() => {
    try {
      const saved = localStorage.getItem('synergy_selected_card');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      console.error('Failed to parse synergy_selected_card', e);
      return null;
    }
  });
  const [kycStatus, setKycStatus] = useState<KYCStatus>(() => {
      const saved = localStorage.getItem('synergy_kyc');
      return (saved as KYCStatus) || 'Unverified';
  });

  useEffect(() => { if (user) localStorage.setItem('synergy_user', JSON.stringify(user)); else localStorage.removeItem('synergy_user'); }, [user]);
  useEffect(() => { if (referrer) localStorage.setItem('synergy_referrer', JSON.stringify(referrer)); else localStorage.removeItem('synergy_referrer'); }, [referrer]);
  useEffect(() => { localStorage.setItem('synergy_cart', JSON.stringify(cart)); }, [cart]);
  useEffect(() => { localStorage.setItem('synergy_products', JSON.stringify(products)); }, [products]);
  useEffect(() => { localStorage.setItem('synergy_ads', JSON.stringify(ads)); }, [ads]);
  useEffect(() => { localStorage.setItem('synergy_campaign_assets', JSON.stringify(campaignAssets)); }, [campaignAssets]);
  useEffect(() => { localStorage.setItem('synergy_feed', JSON.stringify(feed)); }, [feed]);
  useEffect(() => { localStorage.setItem('synergy_onboarding', JSON.stringify(onboardingSlides)); }, [onboardingSlides]);
  useEffect(() => { localStorage.setItem('synergy_orders', JSON.stringify(allOrders)); }, [allOrders]);
  useEffect(() => { localStorage.setItem('synergy_team', JSON.stringify(allTeam)); }, [allTeam]);
  useEffect(() => { localStorage.setItem('synergy_commissions', JSON.stringify(allCommissions)); }, [allCommissions]);
  useEffect(() => { localStorage.setItem('synergy_notifications', JSON.stringify(allNotifications)); }, [allNotifications]);
  useEffect(() => { 
    localStorage.setItem('synergy_lang', language);
    document.documentElement.lang = language;
  }, [language]);
  useEffect(() => { localStorage.setItem('synergy_settings', JSON.stringify(systemSettings)); }, [systemSettings]);
  useEffect(() => { localStorage.setItem('synergy_addresses', JSON.stringify(addresses)); }, [addresses]);
  useEffect(() => { localStorage.setItem('synergy_selected_address', JSON.stringify(selectedAddressId)); }, [selectedAddressId]);
  useEffect(() => { localStorage.setItem('synergy_banks', JSON.stringify(bankAccounts)); }, [bankAccounts]);
  useEffect(() => { localStorage.setItem('synergy_selected_bank', JSON.stringify(selectedBankId)); }, [selectedBankId]);
  useEffect(() => { localStorage.setItem('synergy_cards', JSON.stringify(savedCards)); }, [savedCards]);
  useEffect(() => { localStorage.setItem('synergy_selected_card', JSON.stringify(selectedCardId)); }, [selectedCardId]);
  useEffect(() => { localStorage.setItem('synergy_payment_method', paymentMethod); }, [paymentMethod]);
  useEffect(() => { localStorage.setItem('synergy_kyc', kycStatus); }, [kycStatus]);
  
  useEffect(() => {
      localStorage.setItem('synergy_font_size', fontSize);
      const root = document.documentElement;
      if (fontSize === 'small') {
          root.style.fontSize = '14px';
      } else if (fontSize === 'large') {
          root.style.fontSize = '19px';
      } else {
          root.style.fontSize = '16px';
      }
  }, [fontSize]);

  const showToast = useCallback((msg: Omit<ToastMessage, 'id'>) => {
      setCurrentToast({ ...msg, id: Date.now() });
  }, []);

  const dismissToast = useCallback(() => {
      setCurrentToast(null);
  }, []);

  const getTierBySales = (sales: number): UserTier => {
    const s = TO_PRECISION(sales);
    if (s >= TIER_THRESHOLDS[UserTier.EXECUTIVE]) return UserTier.EXECUTIVE;
    if (s >= TIER_THRESHOLDS[UserTier.BUILDER]) return UserTier.BUILDER;
    if (s >= TIER_THRESHOLDS[UserTier.MARKETER]) return UserTier.MARKETER;
    return UserTier.STARTER; 
  };

  const login = (email: string, name?: string) => {
    setUser({
      name: name || (email === DEFAULT_USER_EMAIL ? "System Administrator" : "Verified User"),
      username: name || email.split('@')[0],
      email: email,
      phone: email.match(/^[0-9]+$/) ? email : "",
      lineId: "",
      tier: UserTier.STARTER,
      accumulatedSales: 0,    
      walletBalance: 1000, 
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${email}`,
      referralCode: `SYN${Math.floor(1000 + Math.random() * 8999)}`,
      pin: email === DEFAULT_USER_EMAIL ? "123456" : "", 
      password: "password123", 
      teamIncomeExpiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      socials: { facebook: { connected: false, name: '' }, line: { connected: false, name: '' }, google: { connected: true, name: email } }
    });
  };

  const logout = () => {
    setUser(null);
    setCart([]);
    setReferrer(null);
    setAppliedCoupon(null);
    dismissToast();
    setIsSecurityUnlocked(false);
  };

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      const currentQty = existing ? existing.quantity : 0;
      
      if (currentQty >= product.stock) {
        showToast({ message: "Out of stock!", type: 'error' });
        return prev;
      }

      if (existing) return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const removeFromCart = (productId: number) => { setCart(prev => prev.filter(item => item.id !== productId)); };
  const updateCartQuantity = (productId: number, delta: number) => {
    setCart(prev => {
      const item = prev.find(i => i.id === productId);
      if (!item) return prev;
      
      const product = products.find(p => p.id === productId);
      const maxStock = product ? product.stock : item.stock;

      if (delta > 0 && item.quantity >= maxStock) {
        showToast({ message: "Maximum stock reached", type: 'warning' });
        return prev;
      }
      
      return prev.map(item => item.id === productId ? { ...item, quantity: Math.max(1, item.quantity + delta) } : item);
    });
  };

  const getCommissionRate = (): number => user ? (TIER_RATES[user.tier] || TIER_RATES[UserTier.STARTER]) : TIER_RATES[UserTier.STARTER];
  
  const calculateCommission = (price: number) => {
      const preVatPrice = price / 1.07;
      return TO_PRECISION(preVatPrice * getCommissionRate());
  };

  const getNextTierTarget = (): number => {
    if (!user) return TIER_THRESHOLDS[UserTier.MARKETER];
    const s = TO_PRECISION(user.accumulatedSales);
    if (s < TIER_THRESHOLDS[UserTier.MARKETER]) return TIER_THRESHOLDS[UserTier.MARKETER];
    if (s < TIER_THRESHOLDS[UserTier.BUILDER]) return TIER_THRESHOLDS[UserTier.BUILDER];
    return TIER_THRESHOLDS[UserTier.EXECUTIVE]; 
  };

  const addAddress = (address: Omit<Address, 'id'>) => {
    const newId = Date.now();
    const newAddr = { ...address, id: newId };
    setAddresses(prev => address.isDefault ? prev.map(a => ({ ...a, isDefault: false })).concat(newAddr) : [...prev, newAddr]);
    if (!selectedAddressId) setSelectedAddressId(newId);
  };

  const selectAddress = (id: number) => { setSelectedAddressId(id); };
  const setPaymentMethod = (method: PaymentType) => { setPaymentMethodState(method); };

  const applyCoupon = (code: string): boolean => {
    if (code.toUpperCase() === "SYNERGY2024") { 
        setAppliedCoupon({ code: "SYNERGY2024", type: 'percent', value: 5, description: "Launch Bonus 5% Off" }); 
        return true; 
    }
    return false;
  };

  const removeCoupon = () => { setAppliedCoupon(null); };

  const getCartTotals = () => {
    const subtotal = TO_PRECISION(cart.reduce((acc, item) => acc + (item.price * item.quantity), 0));
    let memberDiscount = 0;
    if (user) {
        memberDiscount = subtotal * (TIER_DISCOUNTS[user.tier] || 0);
    }
    memberDiscount = TO_PRECISION(memberDiscount);
    let couponDiscount = appliedCoupon ? (appliedCoupon.type === 'percent' ? TO_PRECISION(subtotal * (appliedCoupon.value / 100)) : appliedCoupon.value) : 0;
    const totalDiscount = TO_PRECISION(memberDiscount + couponDiscount);
    const finalPrice = TO_PRECISION(Math.max(0, subtotal - totalDiscount));
    
    const vat = TO_PRECISION(finalPrice - (finalPrice / 1.07)); 
    const total = finalPrice;
    
    return { subtotal, discount: totalDiscount, memberDiscount, couponDiscount, vat, total };
  };

  const checkout = () => {
    if (!user) return;
    const shippingAddr = addresses.find(a => a.id === selectedAddressId);
    if (!shippingAddr) { alert("Please select a shipping address."); return; }
    const { total } = getCartTotals();
    if (paymentMethod === 'Wallet' && user.walletBalance < total) { alert("Insufficient Wallet Balance!"); return; }
    
    const orderId = `SF-${Math.floor(100000 + Math.random() * 899999)}`;
    const nowTimestamp = new Date().toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    
    const newOrder: Order = { 
        id: orderId, 
        userId: user.email, 
        date: nowTimestamp, 
        items: [...cart], 
        total: total, 
        status: 'Pending', 
        shippingAddress: { ...shippingAddr }, 
        timeline: [
          { status: 'Payment Verified', date: new Date().toLocaleString(), completed: true }, 
          { status: 'Preparing Ship', date: '', completed: false }, 
          { status: 'Shipped', date: '', completed: false }, 
          { status: 'Delivered', date: '', completed: false }
        ] 
    };

    setAllOrders(prev => [newOrder, ...prev]);
    
    if (socket) {
      socket.emit("order:created", newOrder);
    }

    let newBalance = paymentMethod === 'Wallet' ? TO_PRECISION(user.walletBalance - total) : user.walletBalance;
    const newAccumulatedSales = TO_PRECISION(user.accumulatedSales + total);
    const oldTier = user.tier;
    
    // NEW: Logic to determine tier from either Sales Volume OR Promotion Discount level
    let newTier = getTierBySales(newAccumulatedSales);
    
    // Special Promotion Check: If user buys a promo product, grant level based on promo discount
    cart.forEach(item => {
        if (item.isPromo && item.promoDiscount) {
            let promoTier = UserTier.STARTER;
            if (item.promoDiscount >= 30) promoTier = UserTier.EXECUTIVE;
            else if (item.promoDiscount >= 20) promoTier = UserTier.BUILDER;
            else if (item.promoDiscount >= 10) promoTier = UserTier.MARKETER;
            
            // Map tiers to hierarchy values for comparison
            const tierValues = { [UserTier.STARTER]: 0, [UserTier.MARKETER]: 1, [UserTier.BUILDER]: 2, [UserTier.EXECUTIVE]: 3 };
            if (tierValues[promoTier] > tierValues[newTier]) {
                newTier = promoTier;
            }
        }
    });

    if (newTier !== oldTier) {
        setPendingLevelUp({
            tier: newTier,
            oldTier: oldTier,
            commissionRate: TIER_RATES[newTier] * 100
        });
    }

    let newExpiry = user.teamIncomeExpiry;
    if (user.tier !== UserTier.STARTER || newTier !== UserTier.STARTER) {
        const now = new Date();
        const currentExpiry = user.teamIncomeExpiry ? new Date(user.teamIncomeExpiry) : now;
        const baseDate = currentExpiry > now ? currentExpiry : now;
        const extendedDate = new Date(baseDate.getTime() + (30 * 24 * 60 * 60 * 1000));
        newExpiry = extendedDate.toISOString();
    }

    setUser({ 
        ...user, 
        walletBalance: newBalance,
        accumulatedSales: newAccumulatedSales,
        tier: newTier,
        teamIncomeExpiry: newExpiry
    });

    setProducts(prev => prev.map(p => {
        const cartItem = cart.find(ci => ci.id === p.id);
        return cartItem ? { ...p, sold: p.sold + cartItem.quantity, stock: Math.max(0, p.stock - cartItem.quantity) } : p;
    }));
    setCart([]);
    setAppliedCoupon(null);
    setAllNotifications(prev => [{ id: Date.now(), userId: user.email, title: "Order Placed", message: `Order ${newOrder.id} is pending.`, date: "Just now", type: 'order', read: false, relatedId: newOrder.id, relatedType: 'order' }, ...prev]);
  };

  const updateOrderStatus = (orderId: string, status: OrderStatus, reason?: string) => { 
      if (status === 'To Ship' && socket) {
        socket.emit("admin:verify_payment", orderId);
      }
      setAllOrders(prev => prev.map(o => {
          if (o.id === orderId) {
              const now = new Date().toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
              
              let updatedTimeline = [...o.timeline];

              if (status === 'To Ship') {
                  updatedTimeline = updatedTimeline.map(step => step.status === 'Preparing Ship' ? { ...step, completed: true, date: now } : step);
              } else if (status === 'Shipped') {
                  updatedTimeline = updatedTimeline.map(step => step.status === 'Shipped' ? { ...step, completed: true, date: now } : step);
              } else if (status === 'Delivered') {
                  updatedTimeline = updatedTimeline.map(step => step.status === 'Delivered' ? { ...step, completed: true, date: now } : step);
                  settleCommissionForOrder(orderId);
              } else if (status === 'Return Pending') {
                  updatedTimeline.push({ status: 'Return Requested', date: now, completed: true });
              } else if (status === 'Returned') {
                  updatedTimeline.push({ status: 'Returned & Refunded', date: now, completed: true });
                  reverseCommissionAndSales(orderId, o.total);
              }

              return { ...o, status, timeline: updatedTimeline, returnReason: reason || o.returnReason };
          }
          return o;
      })); 
  };

  const reverseCommissionAndSales = (orderId: string, orderTotal: number) => {
      setAllCommissions(prev => {
          const txIndex = prev.findIndex(t => t.orderId === orderId);
          if (txIndex === -1) return prev;

          const commissionTx = prev[txIndex];
          const newCommissions = [...prev];
          
          if (commissionTx.status === 'Paid' && user && commissionTx.userId === user.email) {
              setUser(curr => curr ? ({
                  ...curr,
                  walletBalance: TO_PRECISION(curr.walletBalance - commissionTx.amount),
                  accumulatedSales: TO_PRECISION(Math.max(0, curr.accumulatedSales - orderTotal))
              }) : null);

              setAllNotifications(notifs => [{
                  id: Date.now() + 5,
                  userId: user.email,
                  title: "Commission Reversed",
                  message: `Commission of ฿${commissionTx.amount} for Order ${orderId} has been deducted due to product return.`,
                  date: "Just now",
                  type: 'system',
                  read: false
              }, ...notifs]);
          }

          newCommissions[txIndex] = { ...commissionTx, status: 'Cancelled' };
          return newCommissions;
      });
  };

  const settleCommissionForOrder = (orderId: string) => {
      setAllCommissions(prev => {
          const txIndex = prev.findIndex(t => t.orderId === orderId && t.status === 'Pending');
          if (txIndex === -1) return prev;

          const updatedTx = { ...prev[txIndex], status: 'Paid' as const };
          const newCommissions = [...prev];
          newCommissions[txIndex] = updatedTx;

          if (user && updatedTx.userId === user.email) {
              setUser(curr => curr ? ({
                  ...curr,
                  walletBalance: TO_PRECISION(curr.walletBalance + updatedTx.amount)
              }) : null);
              
              setAllNotifications(notifs => [{
                  id: Date.now() + 1,
                  userId: user.email,
                  title: "Commission Settled! ฿" + updatedTx.amount,
                  message: `Your commission for order ${orderId} has been moved to available balance.`,
                  date: "Just now",
                  type: 'promo',
                  read: false,
                  relatedId: updatedTx.id,
                  relatedType: 'commission'
              }, ...notifs]);
          }
          return newCommissions;
      });
  };

  const addBankAccount = (account: Omit<BankAccount, 'id'>): boolean => {
    if (bankAccounts.length >= 2) return false;
    const newBank = { ...account, id: Date.now() };
    setBankAccounts(prev => [...prev, newBank]);
    if (!selectedBankId) setSelectedBankIdState(newBank.id);
    return true;
  };
  const removeBankAccount = (id: number) => { 
    setBankAccounts(prev => prev.filter(b => b.id !== id)); 
    if (selectedBankId === id) setSelectedBankIdState(null);
  };
  const selectBank = (id: number) => { setSelectedBankIdState(id); };

  const addCreditCard = (card: Omit<CreditCardInfo, 'id' | 'brand'>) => {
    const brands: ('Visa' | 'Mastercard' | 'JCB' | 'Amex')[] = ['Visa', 'Mastercard', 'JCB', 'Amex'];
    const brand = brands[Math.floor(Math.random() * brands.length)];
    const newCard = { ...card, id: Date.now(), brand };
    setSavedCards(prev => [...prev, newCard]);
    if (!selectedCardId) setSelectedCardIdState(newCard.id);
  };
  const removeCreditCard = (id: number) => {
    setSavedCards(prev => prev.filter(c => c.id !== id));
    if (selectedCardId === id) setSelectedCardIdState(null);
  };
  const selectCreditCard = (id: number) => { setSelectedCardIdState(id); };

  const updateKycStatus = (status: KYCStatus) => { setKycStatus(status); };
  const updateUserProfile = (data: Partial<User>) => { if (user) setUser({ ...user, ...data }); };
  
  const withdrawFunds = (amount: number, bankId: number): CommissionTransaction | null => {
    if (!user) return null;
    if (kycStatus !== 'Verified') return null; 
    
    const bank = bankAccounts.find(b => b.id === bankId);
    if (!bank) return null; 
    const nowTimestamp = new Date().toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    const newTx: CommissionTransaction = { id: Date.now(), userId: user.email, date: nowTimestamp, source: `Withdrawal: ${bank.accountName} | ${bank.bankName} | ACC: ${bank.accountNumber}`, type: "Withdrawal", amount: -amount, status: "Waiting" };
    setAllCommissions(prev => [newTx, ...prev]);
    setUser({ ...user, walletBalance: TO_PRECISION(user.walletBalance - amount) });
    return newTx;
  };

  const markNotificationAsRead = (id: number) => {
      setAllNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const toggleFeedLike = (id: number) => {
      setFeed(prev => prev.map(post => {
          if (post.id === id) {
              return { 
                  ...post, 
                  isLiked: !post.isLiked, 
                  likes: post.isLiked ? post.likes - 1 : post.likes + 1 
              };
          }
          return post;
      }));
  };

  const addFeedComment = (postId: number, text: string) => {
    if (!user) return;
    setFeed(prev => prev.map(post => {
        if (post.id === postId) {
            const newComment = {
                id: Date.now(),
                user: user.name,
                avatar: user.avatar,
                text,
                date: "Just now"
            };
            return { ...post, comments: [newComment, ...post.comments] };
        }
        return post;
    }));
  };

  const createPost = (data: { image: string, caption: string, mood: string, isAd: boolean, productId?: number }) => {
    if (!user) return;
    const newPost: FeedItem = {
        id: Date.now(),
        type: 'image',
        category: data.isAd ? 'Trending' : 'For You',
        user: user.name,
        userId: user.email,
        avatar: user.avatar,
        content: data.image,
        caption: data.caption,
        mood: data.mood,
        status: 'Pending',
        likes: 0,
        isLiked: false,
        shares: 0,
        comments: [],
        isAi: true,
        isAd: data.isAd,
        productId: data.productId
    };
    setFeed(prev => [newPost, ...prev]);
    
    setAllNotifications(prev => [{
        id: Date.now(),
        userId: user.email,
        title: data.isAd ? "Ad Campaign Created" : "Content Reviewing",
        message: data.isAd ? "Your advertisement is being audited for high-conversion standards." : "Your AI-assisted post is being audited for compliance.",
        date: "Just now",
        type: 'system',
        read: false
    }, ...prev]);
  };

  const addReview = (productId: number, orderId: string, rating: number, text: string, images: string[]) => {
      if (!user) return;
      setProducts(prev => prev.map(p => {
          if (p.id === productId) {
              const newReview = { id: Date.now(), user: user.name, rating, text, date: new Date().toLocaleDateString(), images };
              return { ...p, reviews: [newReview, ...(p.reviews || [])] };
          }
          return p;
      }));

      // Mark as reviewed in the order
      setAllOrders(prev => prev.map(o => {
          if (o.id === orderId) {
              const reviewedIds = o.reviewedProductIds || [];
              if (!reviewedIds.includes(productId)) {
                  return { ...o, reviewedProductIds: [...reviewedIds, productId] };
              }
          }
          return o;
      }));
  };

  const updateUserSocials = (platform: 'facebook' | 'line' | 'google', connected: boolean, name: string) => {
      if (!user) return;
      setUser({
          ...user,
          socials: {
              ...(user.socials || { facebook: { connected: false, name: '' }, line: { connected: false, name: '' }, google: { connected: false, name: '' } }),
              [platform]: { connected, name }
          }
      });
  };

  const updateUserSecurity = (type: 'password' | 'pin', value: string) => {
      if (!user) return;
      setUser({ ...user, [type]: value });
  };

  const addReferrer = (code: string): boolean => {
      if (!user) return false;
      // In a real app, verify code with DB
      const mockReferrer: Referrer = {
          name: "Synergy Lead",
          code,
          tier: UserTier.BUILDER,
          avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=SynergyLead",
          phone: "081-123-4567",
          lineId: "@synergy"
      };
      setReferrer(mockReferrer);
      return true;
  };

  const updateOrderAddress = (orderId: string, address: Address) => {
      setAllOrders(prev => prev.map(o => o.id === orderId ? { ...o, shippingAddress: address } : o));
  };

  // Admin Methods Implementation
  const updateProduct = (productId: number, data: Partial<Product>) => {
      setProducts(prev => prev.map(p => p.id === productId ? { ...p, ...data } : p));
  };
  const deleteProduct = (productId: number) => { setProducts(prev => prev.filter(p => p.id !== productId)); };
  const addProduct = (product: Omit<Product, 'id'>) => { setProducts(prev => [...prev, { ...product, id: Date.now() }]); };
  const updateAd = (adId: number, data: Partial<Ad>) => {
      setAds(prev => prev.map(a => a.id === adId ? { ...a, ...data } : a));
  };
  const deleteAd = (adId: number) => { setAds(prev => prev.filter(a => a.id !== adId)); };
  const addAd = (ad: Omit<Ad, 'id'>) => { setAds(prev => [...prev, { ...ad, id: Date.now() }]); };
  const updateCampaignAsset = (assetId: number, data: Partial<CampaignAsset>) => { setCampaignAssets(prev => prev.map(a => a.id === assetId ? { ...a, ...data } : a)); };
  const deleteCampaignAsset = (assetId: number) => { setCampaignAssets(prev => prev.filter(a => a.id !== assetId)); };
  const addCampaignAsset = (asset: Omit<CampaignAsset, 'id'>) => { setCampaignAssets(prev => [...prev, { ...asset, id: Date.now() }]); };
  const updateOnboardingSlide = (slideId: number, data: Partial<OnboardingSlide>) => { setOnboardingSlides(prev => prev.map(s => s.id === slideId ? { ...s, ...data } : s)); };
  const deleteOnboardingSlide = (slideId: number) => { setOnboardingSlides(prev => prev.filter(s => s.id !== slideId)); };
  const addOnboardingSlide = (slide: Omit<OnboardingSlide, 'id'>) => { setOnboardingSlides(prev => [...prev, { ...slide, id: Date.now() }]); };
  const deleteOrder = (orderId: string) => { setAllOrders(prev => prev.filter(o => o.id !== orderId)); };
  const updateCommissionStatus = (txId: number, status: CommissionTransaction['status']) => { 
      setAllCommissions(prev => prev.map(c => c.id === txId ? { ...c, status } : c)); 
  };
  const deleteCommission = (txId: number) => { setAllCommissions(prev => prev.filter(c => c.id !== txId)); };
  const deleteTeamMember = (memberId: number) => { setAllTeam(prev => prev.filter(m => m.id !== memberId)); };
  const updateMemberTier = (memberId: number, tier: UserTier) => { setAllTeam(prev => prev.map(m => m.id === memberId ? { ...m, tier } : m)); };
  const updateFeedStatus = (postId: number, status: 'Approved' | 'Pending') => { 
      if (status === 'Approved' && socket) {
        socket.emit("admin:approve_post", postId);
      }
      setFeed(prev => prev.map(p => p.id === postId ? { ...p, status } : p)); 
  };
  const deleteFeedPost = (postId: number) => { setFeed(prev => prev.filter(p => p.id !== postId)); };
  const updateFeedPost = (postId: number, data: Partial<FeedItem>) => {
      setFeed(prev => prev.map(p => p.id === postId ? { ...p, ...data } : p));
  };
  const broadcastPromotion = (promo: Omit<Promotion, 'id' | 'active'>) => { setActivePromo({ ...promo, id: Date.now(), active: true }); };
  const dismissPromotion = () => { setActivePromo(null); };
  const updateSystemSettings = (data: Partial<SystemSettings>) => { setSystemSettings(prev => ({ ...prev, ...data })); };

  // Internationalization Helper
  const t = (key: string) => {
      const entry = dictionary[key];
      if (!entry) return key;
      return entry[language] || entry.en;
  };

  const contextValue: AppContextType = {
    user, isLoggedIn, cart, products, feed, ads, campaignAssets, onboardingSlides, team: userTeam, referrer, commissions: userCommissions, orders: userOrders, addresses, selectedAddressId, paymentMethod, appliedCoupon, notifications: userNotifications, activePromo, systemSettings, isSearchActive, setIsSearchActive, pendingLevelUp, dismissLevelUp, isSecurityUnlocked, setIsSecurityUnlocked, notificationsEnabled, setNotificationsEnabled, currentToast, showToast, bottomNavHidden, setBottomNavHidden, dismissToast, allOrders, allTeamMembers: allTeam, allCommissions, bankAccounts, selectedBankId, savedCards, selectedCardId, kycStatus, language, setLanguage, fontSize, setFontSize, t, login, logout, addToCart, removeFromCart, updateCartQuantity, checkout, calculateCommission, getNextTierTarget, getCommissionRate, addAddress, selectAddress, setPaymentMethod, applyCoupon, removeCoupon, getCartTotals, addBankAccount, removeBankAccount, selectBank, addCreditCard, removeCreditCard, selectCreditCard, updateKycStatus, updateUserProfile, withdrawFunds, markNotificationAsRead, toggleFeedLike, addFeedComment, createPost, addReview, updateUserSocials, updateUserSecurity, addReferrer, updateOrderAddress, updateProduct, deleteProduct, addProduct, updateAd, deleteAd, addAd, updateCampaignAsset, deleteCampaignAsset, addCampaignAsset, updateOnboardingSlide, deleteOnboardingSlide, addOnboardingSlide, updateOrderStatus, deleteOrder, updateCommissionStatus, deleteCommission, deleteTeamMember, updateMemberTier, updateFeedStatus, deleteFeedPost, updateFeedPost, broadcastPromotion, dismissPromotion, updateSystemSettings
  };

  return <AppContext.Provider value={contextValue}>{children}</AppContext.Provider>;
};
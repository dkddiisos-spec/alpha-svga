
export interface SVGAParams {
  viewBoxWidth: number;
  viewBoxHeight: number;
  fps: number;
  frames: number;
}

export interface SVGAMovieEntity {
  version: string;
  params: SVGAParams;
  images: Record<string, Uint8Array>;
  sprites: any[];
  audios?: Record<string, Uint8Array>;
}

export enum SbsLayout {
  COLOR_LEFT = 'COLOR_LEFT',
  ALPHA_LEFT = 'ALPHA_LEFT'
}

export enum Page {
  STORE = 'STORE',
  TOOLS_HUB = 'TOOLS_HUB',
  ADMIN = 'ADMIN',
  LOGIN = 'LOGIN',
  CONVERT = 'CONVERT',
  EDIT = 'EDIT',
  COMPRESS = 'COMPRESS',
  SVGA_TO_MP4 = 'SVGA_TO_MP4',
  MP4_TO_MP4_RESIZE = 'MP4_TO_MP4_RESIZE',
  MP4_COLOR_TO_SBS = 'MP4_COLOR_TO_SBS',
  MP4_05_TO_SVGA = 'MP4_05_TO_SVGA',
  MP4_NORMAL_TO_05 = 'MP4_NORMAL_TO_05',
  MP4_DIRECT_TO_SVGA = 'MP4_DIRECT_TO_SVGA',
  MP4_05_TO_11 = 'MP4_05_TO_11',
  SVGA_ADD_SOUND = 'SVGA_ADD_SOUND',
  PROFILE = 'PROFILE'
}

export interface LicenseKey {
  id: string;
  key: string;
  createdAt: number;
  expiresAt: number | null;
  isUsed: boolean;
  activatedAt: number | null;
  deviceId: string | null;
}

export interface UserStats {
  deviceId: string;
  trialStartedAt: number | null;
  usageCount: number;
  lastActive: number;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  type: 'svga' | '1.1' | '0.5';
  fileUrl: string;
  imageUrl: string;
  audioUrl?: string;
  categoryId: string;
}

export interface Category {
  id: string;
  name: string;
}

export interface Order {
  id: string;
  productId: string;
  status: 'pending' | 'approved' | 'rejected';
  paymentMethod: 'vodafone' | 'usdt' | 'binance';
  customerName: string;
  proofImageUrl: string;
  timestamp: number;
  downloaded: boolean;
}

export interface SiteConfig {
  siteName: string;
  logoUrl: string;
  banners: string[];
  vodafoneNumber: string;
  usdtAddress: string;
  binanceId: string;
  stats: {
    visitors: number;
    downloads: number;
    sales: number;
  };
}

import { UserManager } from '../../auth/UserManager';
import { SlotGameInfo, SpinResult } from './types';
import { WildBountyEngine } from './WildBountyEngine';

export class SlotsManager {
  private userManager: UserManager;
  private wildBountyEngine: WildBountyEngine;

  private games: SlotGameInfo[] = [
    {
      id: 'wild-bounty-showdown',
      name: 'Wild Bounty Showdown',
      tagline: 'Nữ Thợ Săn Tiền Thưởng Viễn Tây - Nhân Đôi Hệ Số Lên Đến x1,024!',
      provider: 'Pocket Games Soft (PG Soft)',
      banner: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=800&q=80',
      reels: [3, 4, 5, 5, 4, 3],
      rtp: '96.75%',
      maxWin: '5,000x',
      volatility: 'Cao',
      features: [
        '3,600 Cách Chiến Thắng',
        'Nổ Liên Hoàn (Cascading Reels)',
        'Biểu Tượng Viền Vàng Hóa WILD',
        'Nhân Đôi Hệ Số x1 ➔ x1,024',
        'Free Spins Khởi Điểm x8 Multiplier',
        'Tính Năng Mua Vòng Quay Miễn Phí (Feature Buy)'
      ]
    },
    {
      id: 'fortune-ox',
      name: 'Fortune Ox',
      tagline: 'Trâu Vàng May Mắn - Nhân Thập Bội x10 Toàn Màn Hình (Sắp Ra Mắt)',
      provider: 'Pocket Games Soft (PG Soft)',
      banner: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=800&q=80',
      reels: [3, 4, 3],
      rtp: '96.75%',
      maxWin: '2,000x',
      volatility: 'Trung bình',
      features: ['Respin Khóa Cuộn May Mắn', 'Hệ Số Nhân x10 Toàn Bảng']
    },
    {
      id: 'mahjong-ways-2',
      name: 'Mahjong Ways 2',
      tagline: 'Mạt Chược Huyền Bí 2 - Nổ Hũ Biến Wild Mạ Vàng (Sắp Ra Mắt)',
      provider: 'Pocket Games Soft (PG Soft)',
      banner: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=800&q=80',
      reels: [4, 5, 5, 5, 4],
      rtp: '96.95%',
      maxWin: '100,000x',
      volatility: 'Trung bình',
      features: ['Biến Đổi Mạ Vàng', 'Multiplier x10 Free Spins']
    }
  ];

  constructor(userManager: UserManager) {
    this.userManager = userManager;
    this.wildBountyEngine = new WildBountyEngine(userManager);
  }

  public getGames(): SlotGameInfo[] {
    return this.games;
  }

  public getGame(slotId: string): SlotGameInfo | undefined {
    return this.games.find(g => g.id === slotId);
  }

  public getFreeSpins(slotId: string, userId: string) {
    if (slotId === 'wild-bounty-showdown') {
      return this.wildBountyEngine.getFreeSpins(userId);
    }
    return null;
  }

  public spin(
    userId: string,
    slotId: string,
    betAmount: number,
    options?: { buyFeature?: boolean }
  ): { success: boolean; result?: SpinResult; message?: string } {
    if (slotId === 'wild-bounty-showdown') {
      return this.wildBountyEngine.spin(userId, betAmount, options);
    }
    return { success: false, message: 'Game slot chưa được hỗ trợ.' };
  }
}

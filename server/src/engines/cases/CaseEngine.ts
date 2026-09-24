import crypto from 'crypto';
import { UserManager, ItemRarity, InventoryItem } from '../../auth/UserManager';
import { CaseDefinition, CaseItemTemplate, CaseOpenResult } from './types';

export const CASE_DEFINITIONS: CaseDefinition[] = [
  {
    id: 'case_bronze',
    name: 'Hòm Tân Thủ (Mil-Spec)',
    description: 'Hòm sơ cấp dễ tiếp cận với tỉ lệ cân bằng cao, thích hợp khởi đầu.',
    price: 50,
    icon: '📦',
    badge: '50 🪙',
    gradient: 'from-amber-700 to-orange-600',
    items: [
      // Trắng (White, 54% - avg 15 coin)
      { itemId: 'p250_sand_dune', name: 'P250 | Sand Dune', rarity: 'white', value: 12, icon: '🔫', weaponType: 'Pistol' },
      { itemId: 'mp9_storm', name: 'MP9 | Storm', rarity: 'white', value: 15, icon: '⚡', weaponType: 'SMG' },
      { itemId: 'nova_polar_mesh', name: 'Nova | Polar Mesh', rarity: 'white', value: 18, icon: '💥', weaponType: 'Shotgun' },
      // Xanh (Blue, 28% - avg 35 coin)
      { itemId: 'glock_high_beam', name: 'Glock-18 | High Beam', rarity: 'blue', value: 30, icon: '🔫', weaponType: 'Pistol' },
      { itemId: 'galil_rocket_pop', name: 'Galil AR | Rocket Pop', rarity: 'blue', value: 35, icon: '🚀', weaponType: 'Rifle' },
      { itemId: 'usps_blueprint', name: 'USP-S | Blueprint', rarity: 'blue', value: 40, icon: '📐', weaponType: 'Pistol' },
      // Tím (Purple, 12% - avg 85 coin)
      { itemId: 'm4a4_evil_daimyo', name: 'M4A4 | Evil Daimyo', rarity: 'purple', value: 75, icon: '👺', weaponType: 'Rifle' },
      { itemId: 'ak47_elite_build', name: 'AK-47 | Elite Build', rarity: 'purple', value: 95, icon: '⚜️', weaponType: 'Rifle' },
      // Đỏ (Red, 5% - avg 220 coin)
      { itemId: 'awp_fever_dream', name: 'AWP | Fever Dream', rarity: 'red', value: 200, icon: '🎯', weaponType: 'Sniper' },
      { itemId: 'deagle_mecha', name: 'Desert Eagle | Mecha Industries', rarity: 'red', value: 240, icon: '🤖', weaponType: 'Pistol' },
      // Vàng (Gold, 1% - avg 840 coin)
      { itemId: 'gut_tiger_tooth', name: '★ Gut Knife | Tiger Tooth', rarity: 'gold', value: 800, icon: '🔪', weaponType: 'Knife' },
      { itemId: 'daggers_fade', name: '★ Shadow Daggers | Fade', rarity: 'gold', value: 880, icon: '🗡️', weaponType: 'Knife' }
    ]
  },
  {
    id: 'case_silver',
    name: 'Hòm Chiến Binh (Classified)',
    description: 'Hòm trung cấp sở hữu nhiều skin huyền thoại với giá trị quy đổi lớn.',
    price: 250,
    icon: '💼',
    badge: '250 🪙',
    gradient: 'from-blue-600 to-indigo-700',
    items: [
      // Trắng (White, 54% - avg 75 coin)
      { itemId: 'p90_grim', name: 'P90 | Grim', rarity: 'white', value: 65, icon: '💀', weaponType: 'SMG' },
      { itemId: 'famas_survivor', name: 'FAMAS | Survivor Z', rarity: 'white', value: 75, icon: '🧟', weaponType: 'Rifle' },
      { itemId: 'ssg_necropos', name: 'SSG 08 | Necropos', rarity: 'white', value: 85, icon: '🎯', weaponType: 'Sniper' },
      // Xanh (Blue, 28% - avg 175 coin)
      { itemId: 'm4a1s_leaded', name: 'M4A1-S | Leaded Glass', rarity: 'blue', value: 150, icon: '💎', weaponType: 'Rifle' },
      { itemId: 'ak47_point_disarray', name: 'AK-47 | Point Disarray', rarity: 'blue', value: 175, icon: '🎨', weaponType: 'Rifle' },
      { itemId: 'usps_cortex', name: 'USP-S | Cortex', rarity: 'blue', value: 200, icon: '🧠', weaponType: 'Pistol' },
      // Tím (Purple, 12% - avg 425 coin)
      { itemId: 'awp_hyper_beast', name: 'AWP | Hyper Beast', rarity: 'purple', value: 400, icon: '🐉', weaponType: 'Sniper' },
      { itemId: 'deagle_code_red', name: 'Desert Eagle | Code Red', rarity: 'purple', value: 450, icon: '🚨', weaponType: 'Pistol' },
      // Đỏ (Red, 5% - avg 1100 coin)
      { itemId: 'ak47_vulcan', name: 'AK-47 | Vulcan', rarity: 'red', value: 1000, icon: '🌋', weaponType: 'Rifle' },
      { itemId: 'm4a4_emperor', name: 'M4A4 | The Emperor', rarity: 'red', value: 1200, icon: '👑', weaponType: 'Rifle' },
      // Vàng (Gold, 1% - avg 4200 coin)
      { itemId: 'flip_doppler', name: '★ Flip Knife | Doppler', rarity: 'gold', value: 3800, icon: '🌀', weaponType: 'Knife' },
      { itemId: 'karambit_slaughter', name: '★ Karambit | Slaughter', rarity: 'gold', value: 4600, icon: '🩸', weaponType: 'Knife' }
    ]
  },
  {
    id: 'case_gold',
    name: 'Hòm Thượng Cổ (Covert)',
    description: 'Hòm thượng hạng tụ hội các báu vật tối thượng như Dragon Lore và Dao Bướm.',
    price: 1000,
    icon: '👑',
    badge: '1,000 🪙',
    gradient: 'from-amber-500 via-yellow-500 to-amber-600',
    items: [
      // Trắng (White, 54% - avg 300 coin)
      { itemId: 'sg553_integrale', name: 'SG 553 | Integrale', rarity: 'white', value: 260, icon: '🏎️', weaponType: 'Rifle' },
      { itemId: 'aug_flame_jormungandr', name: 'AUG | Flame Jormungandr', rarity: 'white', value: 300, icon: '🔥', weaponType: 'Rifle' },
      { itemId: 'mp7_bloodsport', name: 'MP7 | Bloodsport', rarity: 'white', value: 340, icon: '🏎️', weaponType: 'SMG' },
      // Xanh (Blue, 28% - avg 700 coin)
      { itemId: 'deagle_printstream', name: 'Desert Eagle | Printstream', rarity: 'blue', value: 600, icon: '🤍', weaponType: 'Pistol' },
      { itemId: 'm4a1s_player_two', name: 'M4A1-S | Player Two', rarity: 'blue', value: 700, icon: '👾', weaponType: 'Rifle' },
      { itemId: 'usps_kill_confirmed', name: 'USP-S | Kill Confirmed', rarity: 'blue', value: 800, icon: '💀', weaponType: 'Pistol' },
      // Tím (Purple, 12% - avg 1700 coin)
      { itemId: 'ak47_bloodsport', name: 'AK-47 | Bloodsport', rarity: 'purple', value: 1600, icon: '🏎️', weaponType: 'Rifle' },
      { itemId: 'awp_oni_taiji', name: 'AWP | Oni Taiji', rarity: 'purple', value: 1800, icon: '👺', weaponType: 'Sniper' },
      // Đỏ (Red, 5% - avg 4400 coin)
      { itemId: 'm4a4_howl', name: 'M4A4 | Howl (Contraband)', rarity: 'red', value: 4000, icon: '🐺', weaponType: 'Rifle' },
      { itemId: 'ak47_fire_serpent', name: 'AK-47 | Fire Serpent', rarity: 'red', value: 4800, icon: '🐍', weaponType: 'Rifle' },
      // Vàng (Gold, 1% - avg 16800 coin)
      { itemId: 'butterfly_fade', name: '★ Butterfly Knife | Fade', rarity: 'gold', value: 15000, icon: '🦋', weaponType: 'Knife' },
      { itemId: 'awp_dragon_lore', name: 'AWP | Dragon Lore', rarity: 'gold', value: 18600, icon: '🐉', weaponType: 'Sniper' }
    ]
  }
];

export class CaseEngine {
  private userManager: UserManager;

  constructor(userManager: UserManager) {
    this.userManager = userManager;
  }

  public getCases(): CaseDefinition[] {
    return CASE_DEFINITIONS;
  }

  public getCaseById(caseId: string): CaseDefinition | undefined {
    return CASE_DEFINITIONS.find(c => c.id === caseId);
  }

  /**
   * Determine winning rarity based on self-balanced odds:
   * Trắng: 54% [0 - 53.999]
   * Xanh:  28% [54.0 - 81.999]
   * Tím:   12% [82.0 - 93.999]
   * Đỏ:     5% [94.0 - 98.999]
   * Vàng:   1% [99.0 - 99.999]
   */
  private rollRarity(): ItemRarity {
    const roll = crypto.randomInt(0, 10000) / 100; // 0.00 to 99.99
    if (roll < 54.0) return 'white';
    if (roll < 82.0) return 'blue';
    if (roll < 94.0) return 'purple';
    if (roll < 99.0) return 'red';
    return 'gold';
  }

  private pickItemByRarity(caseDef: CaseDefinition, targetRarity: ItemRarity): CaseItemTemplate {
    const pool = caseDef.items.filter(it => it.rarity === targetRarity);
    if (pool.length === 0) {
      return caseDef.items[0];
    }
    const idx = crypto.randomInt(0, pool.length);
    return pool[idx];
  }

  public openCase(userId: string, caseId: string): CaseOpenResult {
    const caseDef = this.getCaseById(caseId);
    if (!caseDef) {
      return { success: false, message: 'Hòm không tồn tại.' };
    }

    const currentBalance = this.userManager.getBalance(userId);
    if (currentBalance < caseDef.price) {
      return {
        success: false,
        message: `Không đủ tiền mở hòm! Cần ${caseDef.price.toLocaleString('vi-VN')} 🪙, bạn đang có ${currentBalance.toLocaleString('vi-VN')} 🪙.`
      };
    }

    // 1. Deduct cost
    const deductRes = this.userManager.deductBalance(userId, caseDef.price, `Mở ${caseDef.name}`);
    if (!deductRes.success) {
      return { success: false, message: deductRes.message || 'Lỗi trừ tiền mở hòm.' };
    }

    // 2. Roll winning item
    const winningRarity = this.rollRarity();
    const winningTemplate = this.pickItemByRarity(caseDef, winningRarity);

    // 3. Add to user inventory
    const addRes = this.userManager.addItemToInventory(userId, {
      itemId: winningTemplate.itemId,
      name: winningTemplate.name,
      rarity: winningTemplate.rarity,
      value: winningTemplate.value,
      icon: winningTemplate.icon,
      caseType: caseDef.id
    });

    if (!addRes.success || !addRes.item) {
      // Refund if adding failed
      this.userManager.addBalance(userId, caseDef.price, `Hoàn tiền mở hòm ${caseDef.id}`);
      return { success: false, message: 'Lỗi cấp vật phẩm vào kho đồ.' };
    }

    // 4. Generate CS2 Roulette Tape (total 35 items, target index = 30)
    const TAPE_LENGTH = 35;
    const WINNING_INDEX = 30;
    const tape: CaseItemTemplate[] = [];

    for (let i = 0; i < TAPE_LENGTH; i++) {
      if (i === WINNING_INDEX) {
        tape.push(winningTemplate);
      } else {
        // Random rarity with typical distribution to make the strip realistic
        const r = this.rollRarity();
        tape.push(this.pickItemByRarity(caseDef, r));
      }
    }

    return {
      success: true,
      wonItem: addRes.item,
      tape,
      winningIndex: WINNING_INDEX,
      newBalance: this.userManager.getBalance(userId)
    };
  }
}

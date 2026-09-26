import crypto from 'crypto';
import { UserManager, ItemRarity, InventoryItem } from '../../auth/UserManager';
import { CaseDefinition, CaseItemTemplate, CaseOpenResult } from './types';

// BẢNG GIÁ THEO KINH TẾ NGƯỜI CHƠI (avg ~58k, bỏ whale 64B; newbie 500, đi làm 1000/lượt):
// Bronze 5,000 / Silver 25,000 / Gold 100,000 / Dragon 1,000,000 — RTP ~95% mỗi hòm.
export const CASE_DEFINITIONS: CaseDefinition[] = [
  {
    id: 'case_bronze',
    name: 'Hòm Tân Thủ (Mil-Spec)',
    description: 'Hòm khởi đầu cho người mới: 5 lượt đi làm là mở được, vẫn có cơ hội dao xịn.',
    price: 5000,
    icon: '📦',
    badge: '5,000 🪙',
    gradient: 'from-amber-700 to-orange-600',
    items: [
      // Trắng (White, 54% - avg 1,500 coin)
      { itemId: 'p250_sand_dune', name: 'P250 | Sand Dune', rarity: 'white', value: 1200, icon: '🔫', weaponType: 'Pistol' },
      { itemId: 'mp9_storm', name: 'MP9 | Storm', rarity: 'white', value: 1350, icon: '⚡', weaponType: 'SMG' },
      { itemId: 'nova_polar_mesh', name: 'Nova | Polar Mesh', rarity: 'white', value: 1500, icon: '💥', weaponType: 'Shotgun' },
      { itemId: 'sg553_waves', name: 'SG 553 | Waves', rarity: 'white', value: 1600, icon: '🌊', weaponType: 'Rifle' },
      { itemId: 'ump_carbon_fiber', name: 'UMP-45 | Carbon Fiber', rarity: 'white', value: 1750, icon: '⬛', weaponType: 'SMG' },
      { itemId: 'sawed_forest_ddpat', name: 'Sawed-Off | Forest DDPAT', rarity: 'white', value: 1800, icon: '🌲', weaponType: 'Shotgun' },
      // Xanh (Blue, 28% - avg 3,500 coin)
      { itemId: 'glock_high_beam', name: 'Glock-18 | High Beam', rarity: 'blue', value: 3000, icon: '🔫', weaponType: 'Pistol' },
      { itemId: 'galil_rocket_pop', name: 'Galil AR | Rocket Pop', rarity: 'blue', value: 3200, icon: '🚀', weaponType: 'Rifle' },
      { itemId: 'usps_blueprint', name: 'USP-S | Blueprint', rarity: 'blue', value: 3400, icon: '📐', weaponType: 'Pistol' },
      { itemId: 'famas_tobogan', name: 'FAMAS | Tobogan', rarity: 'blue', value: 3600, icon: '🛷', weaponType: 'Rifle' },
      { itemId: 'p90_storm_phase', name: 'P90 | Storm Phase', rarity: 'blue', value: 3800, icon: '⛈️', weaponType: 'SMG' },
      { itemId: 'deagle_urban_rubble', name: 'Desert Eagle | Urban Rubble', rarity: 'blue', value: 4000, icon: '🏚️', weaponType: 'Pistol' },
      // Tím (Purple, 12% - avg 8,500 coin)
      { itemId: 'm4a4_evil_daimyo', name: 'M4A4 | Evil Daimyo', rarity: 'purple', value: 7500, icon: '👺', weaponType: 'Rifle' },
      { itemId: 'ak47_elite_build', name: 'AK-47 | Elite Build', rarity: 'purple', value: 8000, icon: '⚜️', weaponType: 'Rifle' },
      { itemId: 'glock_water_elemental', name: 'Glock-18 | Water Elemental', rarity: 'purple', value: 8500, icon: '🌊', weaponType: 'Pistol' },
      { itemId: 'usps_neo_noir', name: 'USP-S | Neo-Noir', rarity: 'purple', value: 9000, icon: '🌃', weaponType: 'Pistol' },
      { itemId: 'deagle_kumicho', name: 'Desert Eagle | Kumicho Dragon', rarity: 'purple', value: 9500, icon: '🐲', weaponType: 'Pistol' },
      // Đỏ (Red, 5% - avg 22,000 coin)
      { itemId: 'awp_fever_dream', name: 'AWP | Fever Dream', rarity: 'red', value: 20000, icon: '🎯', weaponType: 'Sniper' },
      { itemId: 'deagle_mecha', name: 'Desert Eagle | Mecha Industries', rarity: 'red', value: 21000, icon: '🤖', weaponType: 'Pistol' },
      { itemId: 'm4a1s_chantico', name: "M4A1-S | Chantico's Fire", rarity: 'red', value: 23000, icon: '🔥', weaponType: 'Rifle' },
      { itemId: 'ak47_redline', name: 'AK-47 | Redline', rarity: 'red', value: 24000, icon: '🏁', weaponType: 'Rifle' },
      // Vàng (Gold, 1% - avg 84,000 coin)
      { itemId: 'gut_tiger_tooth', name: '★ Gut Knife | Tiger Tooth', rarity: 'gold', value: 80000, icon: '🔪', weaponType: 'Knife' },
      { itemId: 'daggers_fade', name: '★ Shadow Daggers | Fade', rarity: 'gold', value: 84000, icon: '🗡️', weaponType: 'Knife' },
      { itemId: 'navaja_damascus', name: '★ Navaja Knife | Damascus Steel', rarity: 'gold', value: 88000, icon: '🗡️', weaponType: 'Knife' }
    ]
  },
  {
    id: 'case_silver',
    name: 'Hòm Chiến Binh (Classified)',
    description: 'Hòm trung cấp cho người chơi tầm trung, skin giá trị cao.',
    price: 25000,
    icon: '💼',
    badge: '25,000 🪙',
    gradient: 'from-blue-600 to-indigo-700',
    items: [
      // Trắng (White, 54% - avg 7,500 coin)
      { itemId: 'p90_grim', name: 'P90 | Grim', rarity: 'white', value: 6500, icon: '💀', weaponType: 'SMG' },
      { itemId: 'famas_survivor', name: 'FAMAS | Survivor Z', rarity: 'white', value: 7000, icon: '🧟', weaponType: 'Rifle' },
      { itemId: 'ssg_necropos', name: 'SSG 08 | Necropos', rarity: 'white', value: 7500, icon: '🎯', weaponType: 'Sniper' },
      { itemId: 'ump_primal_saber', name: 'UMP-45 | Primal Saber', rarity: 'white', value: 8000, icon: '🦖', weaponType: 'SMG' },
      { itemId: 'nova_antique', name: 'Nova | Antique', rarity: 'white', value: 8500, icon: '🏺', weaponType: 'Shotgun' },
      { itemId: 'xm_seasons', name: 'XM1014 | Seasons', rarity: 'white', value: 7500, icon: '🍂', weaponType: 'Shotgun' },
      // Xanh (Blue, 28% - avg 17,500 coin)
      { itemId: 'm4a1s_leaded', name: 'M4A1-S | Leaded Glass', rarity: 'blue', value: 15000, icon: '💎', weaponType: 'Rifle' },
      { itemId: 'ak47_point_disarray', name: 'AK-47 | Point Disarray', rarity: 'blue', value: 16000, icon: '🎨', weaponType: 'Rifle' },
      { itemId: 'usps_cortex', name: 'USP-S | Cortex', rarity: 'blue', value: 17000, icon: '🧠', weaponType: 'Pistol' },
      { itemId: 'awp_mortis', name: 'AWP | Mortis', rarity: 'blue', value: 18000, icon: '💀', weaponType: 'Sniper' },
      { itemId: 'glock_bullet_queen', name: 'Glock-18 | Bullet Queen', rarity: 'blue', value: 19000, icon: '👸', weaponType: 'Pistol' },
      { itemId: 'deagle_ocean_drive', name: 'Desert Eagle | Ocean Drive', rarity: 'blue', value: 20000, icon: '🌊', weaponType: 'Pistol' },
      // Tím (Purple, 12% - avg 42,500 coin)
      { itemId: 'awp_hyper_beast', name: 'AWP | Hyper Beast', rarity: 'purple', value: 40000, icon: '🐉', weaponType: 'Sniper' },
      { itemId: 'deagle_code_red', name: 'Desert Eagle | Code Red', rarity: 'purple', value: 41000, icon: '🚨', weaponType: 'Pistol' },
      { itemId: 'm4a4_neo_noir', name: 'M4A4 | Neo-Noir', rarity: 'purple', value: 42500, icon: '🌃', weaponType: 'Rifle' },
      { itemId: 'ak47_neon_revolution', name: 'AK-47 | Neon Revolution', rarity: 'purple', value: 44000, icon: '🌈', weaponType: 'Rifle' },
      { itemId: 'usps_kill_confirmed', name: 'USP-S | Kill Confirmed', rarity: 'purple', value: 45000, icon: '💀', weaponType: 'Pistol' },
      // Đỏ (Red, 5% - avg 110,000 coin)
      { itemId: 'ak47_vulcan', name: 'AK-47 | Vulcan', rarity: 'red', value: 100000, icon: '🌋', weaponType: 'Rifle' },
      { itemId: 'm4a4_emperor', name: 'M4A4 | The Emperor', rarity: 'red', value: 105000, icon: '👑', weaponType: 'Rifle' },
      { itemId: 'awp_asiimov', name: 'AWP | Asiimov', rarity: 'red', value: 110000, icon: '⚪', weaponType: 'Sniper' },
      { itemId: 'm4a1s_hot_rod', name: 'M4A1-S | Hot Rod', rarity: 'red', value: 115000, icon: '🏎️', weaponType: 'Rifle' },
      { itemId: 'glock_fade', name: 'Glock-18 | Fade', rarity: 'red', value: 120000, icon: '🌅', weaponType: 'Pistol' },
      // Vàng (Gold, 1% - avg 420,000 coin)
      { itemId: 'flip_doppler', name: '★ Flip Knife | Doppler', rarity: 'gold', value: 380000, icon: '🌀', weaponType: 'Knife' },
      { itemId: 'karambit_slaughter', name: '★ Karambit | Slaughter', rarity: 'gold', value: 420000, icon: '🩸', weaponType: 'Knife' },
      { itemId: 'm9_tiger_tooth', name: '★ M9 Bayonet | Tiger Tooth', rarity: 'gold', value: 460000, icon: '🐯', weaponType: 'Knife' }
    ]
  },
  {
    id: 'case_gold',
    name: 'Hòm Thượng Cổ (Covert)',
    description: 'Hòm thượng hạng cho đại gia: Dragon Lore, dao Bướm và găng tay Pandora.',
    price: 100000,
    icon: '👑',
    badge: '100,000 🪙',
    gradient: 'from-amber-500 via-yellow-500 to-amber-600',
    items: [
      // Trắng (White, 54% - avg 30,000 coin)
      { itemId: 'sg553_integrale', name: 'SG 553 | Integrale', rarity: 'white', value: 26000, icon: '🏎️', weaponType: 'Rifle' },
      { itemId: 'aug_flame_jormungandr', name: 'AUG | Flame Jormungandr', rarity: 'white', value: 28000, icon: '🔥', weaponType: 'Rifle' },
      { itemId: 'mp7_bloodsport', name: 'MP7 | Bloodsport', rarity: 'white', value: 30000, icon: '🏎️', weaponType: 'SMG' },
      { itemId: 'p90_asiimov', name: 'P90 | Asiimov', rarity: 'white', value: 32000, icon: '⚪', weaponType: 'SMG' },
      { itemId: 'ump_blaze', name: 'UMP-45 | Blaze', rarity: 'white', value: 34000, icon: '🔥', weaponType: 'SMG' },
      { itemId: 'negev_power_loader', name: 'Negev | Power Loader', rarity: 'white', value: 30000, icon: '⚙️', weaponType: 'Rifle' },
      // Xanh (Blue, 28% - avg 70,000 coin)
      { itemId: 'deagle_printstream', name: 'Desert Eagle | Printstream', rarity: 'blue', value: 60000, icon: '🤍', weaponType: 'Pistol' },
      { itemId: 'm4a1s_player_two', name: 'M4A1-S | Player Two', rarity: 'blue', value: 65000, icon: '👾', weaponType: 'Rifle' },
      { itemId: 'ak47_asiimov', name: 'AK-47 | Asiimov', rarity: 'blue', value: 70000, icon: '⚪', weaponType: 'Rifle' },
      { itemId: 'awp_wildfire', name: 'AWP | Wildfire', rarity: 'blue', value: 75000, icon: '🔥', weaponType: 'Sniper' },
      { itemId: 'usps_ticket_hell', name: 'USP-S | Ticket to Hell', rarity: 'blue', value: 80000, icon: '🎫', weaponType: 'Pistol' },
      { itemId: 'glock_wasteland_rebel', name: 'Glock-18 | Wasteland Rebel', rarity: 'blue', value: 70000, icon: '🏜️', weaponType: 'Pistol' },
      // Tím (Purple, 12% - avg 170,000 coin)
      { itemId: 'ak47_bloodsport', name: 'AK-47 | Bloodsport', rarity: 'purple', value: 160000, icon: '🏎️', weaponType: 'Rifle' },
      { itemId: 'awp_oni_taiji', name: 'AWP | Oni Taiji', rarity: 'purple', value: 170000, icon: '👺', weaponType: 'Sniper' },
      { itemId: 'm4a1s_mecha', name: 'M4A1-S | Mecha Industries', rarity: 'purple', value: 160000, icon: '🤖', weaponType: 'Rifle' },
      { itemId: 'deagle_blaze', name: 'Desert Eagle | Blaze', rarity: 'purple', value: 180000, icon: '🔥', weaponType: 'Pistol' },
      { itemId: 'glock_dragon_tattoo', name: 'Glock-18 | Dragon Tattoo', rarity: 'purple', value: 180000, icon: '🐉', weaponType: 'Rifle' },
      // Đỏ (Red, 5% - avg 440,000 coin)
      { itemId: 'm4a4_howl', name: 'M4A4 | Howl (Contraband)', rarity: 'red', value: 400000, icon: '🐺', weaponType: 'Rifle' },
      { itemId: 'ak47_fire_serpent', name: 'AK-47 | Fire Serpent', rarity: 'red', value: 440000, icon: '🐍', weaponType: 'Rifle' },
      { itemId: 'awp_gungnir', name: 'AWP | Gungnir', rarity: 'red', value: 480000, icon: '⚡', weaponType: 'Sniper' },
      { itemId: 'm4a1s_knight', name: 'M4A1-S | Knight', rarity: 'red', value: 440000, icon: '⚔️', weaponType: 'Rifle' },
      // Vàng (Gold, 1% - avg 1,680,000 coin)
      { itemId: 'butterfly_fade', name: '★ Butterfly Knife | Fade', rarity: 'gold', value: 1500000, icon: '🦋', weaponType: 'Knife' },
      { itemId: 'awp_dragon_lore', name: 'AWP | Dragon Lore', rarity: 'gold', value: 1680000, icon: '🐉', weaponType: 'Sniper' },
      { itemId: 'pandora_gloves', name: "★ Sport Gloves | Pandora's Box", rarity: 'gold', value: 1860000, icon: '🧤', weaponType: 'Gloves' }
    ]
  },
  {
    id: 'case_dragon',
    name: 'Hòm Rồng Hoàng Kim (Immortal)',
    description: 'Hòm tối thượng cho cá voi: skin trăm triệu và dao Sapphire huyền thoại.',
    price: 1000000,
    icon: '🐉',
    badge: '1,000,000 🪙',
    gradient: 'from-red-600 via-amber-500 to-yellow-400',
    items: [
      // Trắng (White, 54% - avg 300,000 coin)
      { itemId: 'ak47_redline_dragon', name: 'AK-47 | Redline', rarity: 'white', value: 260000, icon: '🏁', weaponType: 'Rifle' },
      { itemId: 'm4a4_asiimov_dragon', name: 'M4A4 | Asiimov', rarity: 'white', value: 280000, icon: '⚪', weaponType: 'Rifle' },
      { itemId: 'deagle_printstream_dragon', name: 'Desert Eagle | Printstream', rarity: 'white', value: 300000, icon: '🤍', weaponType: 'Pistol' },
      { itemId: 'usps_neo_noir_dragon', name: 'USP-S | Neo-Noir', rarity: 'white', value: 320000, icon: '🌃', weaponType: 'Pistol' },
      { itemId: 'awp_asiimov_dragon', name: 'AWP | Asiimov', rarity: 'white', value: 340000, icon: '⚪', weaponType: 'Sniper' },
      { itemId: 'glock_water_elem_dragon', name: 'Glock-18 | Water Elemental', rarity: 'white', value: 300000, icon: '🌊', weaponType: 'Pistol' },
      // Xanh (Blue, 28% - avg 700,000 coin)
      { itemId: 'ak47_neon_revolution_dragon', name: 'AK-47 | Neon Revolution', rarity: 'blue', value: 600000, icon: '🌈', weaponType: 'Rifle' },
      { itemId: 'm4a1s_hot_rod_dragon', name: 'M4A1-S | Hot Rod', rarity: 'blue', value: 650000, icon: '🏎️', weaponType: 'Rifle' },
      { itemId: 'awp_hyper_beast_dragon', name: 'AWP | Hyper Beast', rarity: 'blue', value: 700000, icon: '🐉', weaponType: 'Sniper' },
      { itemId: 'deagle_code_red_dragon', name: 'Desert Eagle | Code Red', rarity: 'blue', value: 750000, icon: '🚨', weaponType: 'Pistol' },
      { itemId: 'usps_kill_confirmed_dragon', name: 'USP-S | Kill Confirmed', rarity: 'blue', value: 800000, icon: '💀', weaponType: 'Pistol' },
      { itemId: 'glock_fade_dragon', name: 'Glock-18 | Fade', rarity: 'blue', value: 700000, icon: '🌅', weaponType: 'Pistol' },
      // Tím (Purple, 12% - avg 1,700,000 coin)
      { itemId: 'ak47_vulcan_dragon', name: 'AK-47 | Vulcan', rarity: 'purple', value: 1600000, icon: '🌋', weaponType: 'Rifle' },
      { itemId: 'm4a4_emperor_dragon', name: 'M4A4 | The Emperor', rarity: 'purple', value: 1650000, icon: '👑', weaponType: 'Rifle' },
      { itemId: 'awp_dragon_lore_purple', name: 'AWP | Dragon Lore (Battle-Scarred)', rarity: 'purple', value: 1700000, icon: '🐉', weaponType: 'Sniper' },
      { itemId: 'karambit_slaughter_dragon', name: '★ Karambit | Slaughter (Well-Worn)', rarity: 'purple', value: 1800000, icon: '🩸', weaponType: 'Knife' },
      { itemId: 'm4a1s_knight_dragon', name: 'M4A1-S | Knight', rarity: 'purple', value: 1800000, icon: '⚔️', weaponType: 'Rifle' },
      // Đỏ (Red, 5% - avg 4,400,000 coin)
      { itemId: 'm4a4_howl_dragon', name: 'M4A4 | Howl (Factory New)', rarity: 'red', value: 4000000, icon: '🐺', weaponType: 'Rifle' },
      { itemId: 'ak47_fire_serpent_dragon', name: 'AK-47 | Fire Serpent (Factory New)', rarity: 'red', value: 4400000, icon: '🐍', weaponType: 'Rifle' },
      { itemId: 'awp_gungnir_dragon', name: 'AWP | Gungnir (Factory New)', rarity: 'red', value: 4800000, icon: '⚡', weaponType: 'Sniper' },
      { itemId: 'deagle_blaze_dragon', name: 'Desert Eagle | Blaze (Factory New)', rarity: 'red', value: 4400000, icon: '🔥', weaponType: 'Pistol' },
      // Vàng (Gold, 1% - avg 16,800,000 coin)
      { itemId: 'karambit_sapphire', name: '★ Karambit | Doppler Sapphire', rarity: 'gold', value: 15000000, icon: '💎', weaponType: 'Knife' },
      { itemId: 'butterfly_emerald', name: '★ Butterfly Knife | Gamma Doppler Emerald', rarity: 'gold', value: 16800000, icon: '💚', weaponType: 'Knife' },
      { itemId: 'dragon_lore_souvenir', name: '★ AWP | Dragon Lore (Souvenir)', rarity: 'gold', value: 18600000, icon: '🐉', weaponType: 'Sniper' }
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

  public rollItemForBattle(caseId: string): { wonTemplate: CaseItemTemplate; tape: CaseItemTemplate[]; winningIndex: number } | null {
    const caseDef = this.getCaseById(caseId);
    if (!caseDef) return null;

    const winningRarity = this.rollRarity();
    const wonTemplate = this.pickItemByRarity(caseDef, winningRarity);

    const TAPE_LENGTH = 35;
    const WINNING_INDEX = 30;
    const tape: CaseItemTemplate[] = [];

    for (let i = 0; i < TAPE_LENGTH; i++) {
      if (i === WINNING_INDEX) {
        tape.push(wonTemplate);
      } else {
        const r = this.rollRarity();
        tape.push(this.pickItemByRarity(caseDef, r));
      }
    }

    return { wonTemplate, tape, winningIndex: WINNING_INDEX };
  }
}

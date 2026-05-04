import mealPetitdej from './meal-petitdej.png';
import mealBrunch from './meal-brunch.png';
import mealDejeuner from './meal-dejeuner.png';
import mealGouter from './meal-gouter.png';
import mealDiner from './meal-diner.png';
import equipChaiseHaute from './equip-chaise-haute.png';
import equipChange from './equip-change.png';
import equipJeux from './equip-jeux.png';
import equipMenu from './equip-menu.png';

export const MEAL_ICONS: Record<string, string> = {
  petitdej: mealPetitdej,
  brunch: mealBrunch,
  dejeuner: mealDejeuner,
  gouter: mealGouter,
  diner: mealDiner,
};

export type EquipKey = 'high_chair' | 'changing_table' | 'kids_area' | 'kids_menu';

export const EQUIP_ICONS: Record<EquipKey, string> = {
  high_chair: equipChaiseHaute,
  changing_table: equipChange,
  kids_area: equipJeux,
  kids_menu: equipMenu,
};

export const EQUIP_LABELS: Record<EquipKey, string> = {
  high_chair: 'Chaise haute',
  changing_table: 'Table à langer',
  kids_area: 'Espace jeux',
  kids_menu: 'Menu enfant',
};

export const EQUIP_SHORT_LABELS: Record<EquipKey, string> = {
  high_chair: 'Chaise',
  changing_table: 'Change',
  kids_area: 'Jeux',
  kids_menu: 'Menu',
};
